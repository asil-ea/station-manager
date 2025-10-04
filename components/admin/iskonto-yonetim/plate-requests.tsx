'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertCircle, Ban, Check, Loader2, RefreshCcw, ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PlateRequest {
  id: number;
  plaka: string;
  aciklama: string | null;
  durum: 'pending' | 'approved' | 'rejected';
  created_at: string;
  requested_by_name: string | null;
  requested_by_email: string | null;
  requested_by: string | null;
  processed_at: string | null;
  processed_by_name: string | null;
  processed_by: string | null;
  oran_nakit: number | null;
  oran_kredi: number | null;
  reddetme_notu: string | null;
  onaylanan_plaka_id: number | null;
}

interface ApprovalDraft {
  oran_nakit: string;
  oran_kredi: string;
  aciklama: string;
}

interface CurrentUserInfo {
  id: string;
  name: string | null;
}

const statusLabels: Record<PlateRequest['durum'], string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

const statusColors: Record<PlateRequest['durum'], string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

export function PlateRequests() {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<PlateRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<PlateRequest | null>(null);
  const [approvalDraft, setApprovalDraft] = useState<ApprovalDraft>({ oran_nakit: '', oran_kredi: '', aciklama: '' });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<PlateRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        return;
      }

      const { data: userDetails } = await supabase
        .from('user_details')
        .select('name')
        .eq('uid', user.id)
        .single();

      setCurrentUser({
        id: user.id,
        name: userDetails?.name ?? user.email ?? null,
      });
    } catch (err) {
      console.error('Failed to fetch current user info', err);
    }
  }, [supabase]);

  const loadRequests = useCallback(async () => {
    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('iskonto_plaka_talepleri')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (supabaseError) {
        throw supabaseError;
      }

      setRequests((data as PlateRequest[]) ?? []);
    } catch (err) {
      console.error('Failed to load plate requests', err);
      setError('Plaka talepleri yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.durum === 'pending'),
    [requests]
  );

  const processedRequests = useMemo(
    () => requests.filter((request) => request.durum !== 'pending'),
    [requests]
  );

  const formatDateTime = (timestamp: string | null) => {
    if (!timestamp) {
      return '-';
    }

    return new Date(timestamp).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRequests();
  };

  const resetApprovalState = () => {
    setApprovalTarget(null);
    setApprovalDraft({ oran_nakit: '', oran_kredi: '', aciklama: '' });
    setIsProcessing(false);
  };

  const startApproval = (request: PlateRequest) => {
    setSuccessMessage(null);
    setError(null);
    setApprovalTarget(request);
    setApprovalDraft({
      oran_nakit: request.oran_nakit ? String(request.oran_nakit) : '',
      oran_kredi: request.oran_kredi ? String(request.oran_kredi) : '',
      aciklama: request.aciklama ?? '',
    });
  };

  const approveRequest = async () => {
    if (!approvalTarget) {
      return;
    }

    const cashRate = parseFloat(approvalDraft.oran_nakit.replace(',', '.'));
    const cardRate = parseFloat(approvalDraft.oran_kredi.replace(',', '.'));

    if (Number.isNaN(cashRate) || cashRate < 0 || cashRate > 100) {
      setError('Nakit iskonto oranı 0-100 arasında olmalıdır.');
      return;
    }

    if (Number.isNaN(cardRate) || cardRate < 0 || cardRate > 100) {
      setError('Kredi kartı iskonto oranı 0-100 arasında olmalıdır.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Prevent duplicate entries in discount list
      const { data: existingPlate } = await supabase
        .from('iskonto_listesi')
        .select('id')
        .eq('plaka', approvalTarget.plaka)
        .maybeSingle();

      if (existingPlate) {
        throw new Error('Bu plaka zaten iskonto listesinde mevcut.');
      }

      const { data: insertedPlate, error: insertError } = await supabase
        .from('iskonto_listesi')
        .insert({
          plaka: approvalTarget.plaka,
          oran_nakit: cashRate,
          oran_kredi: cardRate,
          aciklama: approvalDraft.aciklama.trim() || approvalTarget.aciklama,
          aktif: true,
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      const processedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('iskonto_plaka_talepleri')
        .update({
          durum: 'approved',
          processed_at: processedAt,
          processed_by: currentUser?.id ?? null,
          processed_by_name: currentUser?.name ?? null,
          oran_nakit: cashRate,
          oran_kredi: cardRate,
          onaylanan_plaka_id: insertedPlate?.id ?? null,
          reddetme_notu: null,
        })
        .eq('id', approvalTarget.id);

      if (updateError) {
        throw updateError;
      }

      setSuccessMessage(`${approvalTarget.plaka} plakası için iskonto başarıyla tanımlandı.`);
      resetApprovalState();
      await loadRequests();
    } catch (err) {
      console.error('Approve request failed', err);
      setError(err instanceof Error ? err.message : 'Talep onaylanırken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectRequest = async () => {
    if (!rejectTarget) {
      return;
    }

    if (!rejectReason.trim()) {
      setError('Reddetme gerekçesi girmelisiniz.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const processedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('iskonto_plaka_talepleri')
        .update({
          durum: 'rejected',
          processed_at: processedAt,
          processed_by: currentUser?.id ?? null,
          processed_by_name: currentUser?.name ?? null,
          reddetme_notu: rejectReason.trim(),
        })
        .eq('id', rejectTarget.id);

      if (updateError) {
        throw updateError;
      }

      setSuccessMessage(`${rejectTarget.plaka} plakası için talep reddedildi.`);
      setRejectTarget(null);
      setRejectReason('');
      await loadRequests();
    } catch (err) {
      console.error('Reject request failed', err);
      setError(err instanceof Error ? err.message : 'Talep reddedilirken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>İskonto Talep Durumu</CardTitle>
            <CardDescription>
              Personel tarafından gönderilen plaka talebini inceleyin ve iskonto tanımlayın.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
            {isRefreshing || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Yenileniyor
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Yenile
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">Bekleyen Talepler</div>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">Onaylanan Talepler</div>
            <div className="text-2xl font-bold">{processedRequests.filter((r) => r.durum === 'approved').length}</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">Reddedilen Talepler</div>
            <div className="text-2xl font-bold">{processedRequests.filter((r) => r.durum === 'rejected').length}</div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">Bir hata oluştu</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-green-700">
          <ShieldCheck className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">İşlem başarılı</p>
            <p className="text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bekleyen Talepler</CardTitle>
          <CardDescription>İskonto tanımlamak için talebi seçin.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Talepler yükleniyor...
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Şu anda bekleyen talep bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plaka</TableHead>
                    <TableHead>Talep Sahibi</TableHead>
                    <TableHead>Talep Nedeni</TableHead>
                    <TableHead>Talep Tarihi</TableHead>
                    <TableHead className="w-[160px]">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id} className={approvalTarget?.id === request.id ? 'bg-muted/40' : undefined}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-base">
                          {request.plaka}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {request.requested_by_name || 'Bilinmiyor'}
                          </span>
                          <span className="text-xs text-muted-foreground">{request.requested_by_email || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {request.aciklama || 'Açıklama belirtilmemiş'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatDateTime(request.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => startApproval(request)}
                            variant={approvalTarget?.id === request.id ? 'default' : 'outline'}
                            disabled={isProcessing}
                          >
                            <Check className="mr-2 h-4 w-4" /> Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectTarget(request);
                              setRejectReason('');
                              setSuccessMessage(null);
                              setError(null);
                            }}
                            disabled={isProcessing}
                          >
                            <Ban className="mr-2 h-4 w-4" /> Reddet
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {approvalTarget && (
            <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{approvalTarget.plaka} için iskonto tanımla</h3>
                  <p className="text-sm text-muted-foreground">
                    Talep eden: {approvalTarget.requested_by_name || 'Bilinmiyor'} · {formatDateTime(approvalTarget.created_at)}
                  </p>
                </div>
                <Button variant="ghost" onClick={resetApprovalState} disabled={isProcessing}>
                  İptal
                </Button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="approval-oran-nakit">Nakit İskonto Oranı (%)</Label>
                  <Input
                    id="approval-oran-nakit"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={approvalDraft.oran_nakit}
                    onChange={(event) =>
                      setApprovalDraft((prev) => ({
                        ...prev,
                        oran_nakit: event.target.value,
                      }))
                    }
                    disabled={isProcessing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval-oran-kredi">Kredi Kartı İskonto Oranı (%)</Label>
                  <Input
                    id="approval-oran-kredi"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={approvalDraft.oran_kredi}
                    onChange={(event) =>
                      setApprovalDraft((prev) => ({
                        ...prev,
                        oran_kredi: event.target.value,
                      }))
                    }
                    disabled={isProcessing}
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="approval-aciklama">Açıklama</Label>
                  <textarea
                    id="approval-aciklama"
                    rows={3}
                    className="h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={approvalDraft.aciklama}
                    onChange={(event) =>
                      setApprovalDraft((prev) => ({
                        ...prev,
                        aciklama: event.target.value,
                      }))
                    }
                    disabled={isProcessing}
                    placeholder="Örn: Kurumsal müşteri, filo aracı vb."
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={resetApprovalState} disabled={isProcessing}>
                  Vazgeç
                </Button>
                <Button onClick={approveRequest} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Onaylanıyor...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Onayı Tamamla
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son İşlemler</CardTitle>
          <CardDescription>Onaylanan veya reddedilen taleplerin geçmişi.</CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Henüz işlenmiş talep bulunmuyor.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plaka</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşleyen</TableHead>
                    <TableHead>Oranlar</TableHead>
                    <TableHead>İşlem Tarihi</TableHead>
                    <TableHead>Not</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {request.plaka}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[request.durum]} border`}>{statusLabels[request.durum]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{request.processed_by_name || '-'}</span>
                          <span className="text-xs text-muted-foreground">{request.processed_by || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.durum === 'approved' ? (
                          <div className="text-sm">
                            %{request.oran_nakit ?? '-'} / %{request.oran_kredi ?? '-'}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatDateTime(request.processed_at)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {request.durum === 'rejected'
                            ? request.reddetme_notu || 'Gerekçe belirtilmedi'
                            : request.aciklama || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Talebi Reddet</DialogTitle>
            <DialogDescription>
              {rejectTarget ? `${rejectTarget.plaka} plakası için talebi reddediyorsunuz.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">Reddetme Gerekçesi</Label>
            <textarea
              id="reject-reason"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Talebi neden reddettiğinizi açıklayın."
              disabled={isProcessing}
            />
          </div>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={isProcessing}>
              İptal
            </Button>
            <Button variant="destructive" onClick={rejectRequest} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reddediliyor...
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" /> Talebi Reddet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
