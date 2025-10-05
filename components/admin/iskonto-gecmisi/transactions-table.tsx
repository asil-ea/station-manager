'use client';

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter, FileText, Image as ImageIcon, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Transaction {
  id: number;
  created_at: string;
  alis_tip: string;
  alis_litre: number;
  alis_tutar: number;
  iskonto_oran: number;
  net_tutar: number;
  litre_fiyat: number;
  aciklama: string | null;
  personel: string;
  fatura_foto: string | null;
  alis_araci: string;
  iskonto_listesi: {
    plaka: string;
    aciklama: string | null;
  };
  user_details: {
    name: string;
  } | null;
}

interface FilterState {
  plaka: string;
  plaka_aciklama: string;
  alis_tip: string;
  alis_araci: string;
  date_from: string;
  date_to: string;
  personel: string;
}

export function TransactionsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    plaka: '',
    plaka_aciklama: '',
    alis_tip: '',
    alis_araci: '',
    date_from: '',
    date_to: '',
    personel: ''
  });

  const supabase = createClient();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // First, fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('iskonto_alisveris')
        .select(`
          *,
          iskonto_listesi!musteri (
            plaka,
            aciklama
          )
        `)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        throw new Error("İşlemler yüklenirken hata oluştu: " + transactionsError.message);
      }

      // Get unique personnel UUIDs
      const personnelUuids = [...new Set(transactionsData?.map(t => t.personel) || [])];
      
      // Fetch user details for all personnel
      const { data: userDetailsData, error: userDetailsError } = await supabase
        .from('user_details')
        .select('uid, name')
        .in('uid', personnelUuids);

      if (userDetailsError) {
        throw new Error("Personel bilgileri yüklenirken hata oluştu: " + userDetailsError.message);
      }

      // Create a map for quick lookup
      const userDetailsMap = new Map(userDetailsData?.map(ud => [ud.uid, ud]) || []);

      // Merge the data
      const enrichedTransactions = transactionsData?.map(transaction => ({
        ...transaction,
        user_details: userDetailsMap.get(transaction.personel) || null
      })) || [];

      setTransactions(enrichedTransactions);
      setFilteredTransactions(enrichedTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by plate
    if (filters.plaka.trim()) {
      filtered = filtered.filter(t => 
        t.iskonto_listesi?.plaka?.toLowerCase().includes(filters.plaka.toLowerCase())
      );
    }

    if (filters.plaka_aciklama.trim()) {
      const searchTerm = filters.plaka_aciklama.toLowerCase();
      filtered = filtered.filter(t => 
        (t.iskonto_listesi?.aciklama || '').toLowerCase().includes(searchTerm)
      );
    }

    // Filter by transaction type
    if (filters.alis_tip.trim()) {
      filtered = filtered.filter(t => 
        t.alis_tip.toLowerCase().includes(filters.alis_tip.toLowerCase())
      );
    }

    // Filter by payment method
    if (filters.alis_araci.trim()) {
      filtered = filtered.filter(t => 
        t.alis_araci.toLowerCase().includes(filters.alis_araci.toLowerCase())
      );
    }

    // Filter by personnel (name for now)
    if (filters.personel.trim()) {
      filtered = filtered.filter(t => 
        t.user_details?.name?.toLowerCase().includes(filters.personel.toLowerCase())
      );
    }

    // Filter by date range
    if (filters.date_from) {
      filtered = filtered.filter(t => 
        new Date(t.created_at) >= new Date(filters.date_from)
      );
    }

    if (filters.date_to) {
      filtered = filtered.filter(t => 
        new Date(t.created_at) <= new Date(filters.date_to + 'T23:59:59')
      );
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setFilters({
      plaka: '',
      plaka_aciklama: '',
      alis_tip: '',
      alis_araci: '',
      date_from: '',
      date_to: '',
      personel: ''
    });
    setFilteredTransactions(transactions);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleImageClick = async (fileName: string) => {
    const { data } = await supabase.storage
      .from('iskonto-fatura')
      .createSignedUrl(fileName, 60);
    
    setSelectedImage(data?.signedUrl || null);
    setImageDialogOpen(true);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const totalLiters = useMemo(
    () => filteredTransactions.reduce((sum, transaction) => sum + transaction.alis_litre, 0),
    [filteredTransactions]
  );

  const totalDiscount = useMemo(
    () =>
      filteredTransactions.reduce(
        (sum, transaction) => sum + (transaction.alis_tutar - transaction.net_tutar),
        0
      ),
    [filteredTransactions]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p>İşlemler yükleniyor...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtreler
              </CardTitle>
              <CardDescription>
                İşlemleri filtrelemek için aşağıdaki alanları kullanın
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Gizle' : 'Göster'}
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="filter-plaka">Plaka</Label>
                <Input
                  id="filter-plaka"
                  placeholder="Plaka ara..."
                  value={filters.plaka}
                  onChange={(e) => setFilters(prev => ({ ...prev, plaka: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="filter-plaka-description">Plaka Açıklaması</Label>
                <Input
                  id="filter-plaka-description"
                  placeholder="Plaka açıklaması ara..."
                  value={filters.plaka_aciklama}
                  onChange={(e) => setFilters(prev => ({ ...prev, plaka_aciklama: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-alis-tip">Alış Tipi</Label>
                <Input
                  id="filter-alis-tip"
                  placeholder="Alış tipi ara..."
                  value={filters.alis_tip}
                  onChange={(e) => setFilters(prev => ({ ...prev, alis_tip: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-alis-araci">Ödeme Yöntemi</Label>
                <Input
                  id="filter-alis-araci"
                  placeholder="Ödeme yöntemi ara..."
                  value={filters.alis_araci}
                  onChange={(e) => setFilters(prev => ({ ...prev, alis_araci: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-personel">Personel</Label>
                <Input
                  id="filter-personel"
                  placeholder="Personel ara..."
                  value={filters.personel}
                  onChange={(e) => setFilters(prev => ({ ...prev, personel: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-date-from">Başlangıç Tarihi</Label>
                <Input
                  id="filter-date-from"
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-date-to">Bitiş Tarihi</Label>
                <Input
                  id="filter-date-to"
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
              
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Filtreleri Temizle
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredTransactions.length} işlem bulundu (toplam {transactions.length} işlem)
        </p>
        <Button variant="outline" onClick={fetchTransactions}>
          Yenile
        </Button>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>İşlem Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {transactions.length === 0 ? "Henüz işlem bulunmuyor" : "Filtreye uygun işlem bulunamadı"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tarih</th>
                    <th className="text-left p-2">Plaka</th>
                    <th className="text-left p-2">Alış Tipi</th>
                    <th className="text-right p-2">Litre</th>
                    <th className="text-right p-2">Litre Fiyatı</th>
                    <th className="text-right p-2">Toplam Tutar</th>
                    <th className="text-right p-2">Toplam İndirim</th>
                    <th className="text-right p-2">İskonto %</th>
                    <th className="text-left p-2">Açıklama</th>
                    <th className="text-left p-2">Personel</th>
                    <th className="text-center p-2">Fatura</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-secondary/10">
                      <td className="p-2 text-sm">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="p-2">
                        {transaction.iskonto_listesi?.aciklama?.trim() ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="font-mono">
                                {transaction.iskonto_listesi?.plaka || 'N/A'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {transaction.iskonto_listesi.aciklama}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline" className="font-mono">
                            {transaction.iskonto_listesi?.plaka || 'N/A'}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary">
                          {transaction.alis_tip}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {transaction.alis_litre.toFixed(2)} L
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCurrency(transaction.litre_fiyat)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCurrency(transaction.alis_tutar)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCurrency(transaction.alis_tutar - transaction.net_tutar)}
                      </td>
                      <td className="p-2 text-right">
                        <Badge variant="destructive">
                          %{transaction.iskonto_oran}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm">
                        {transaction.aciklama?.trim() ? transaction.aciklama : '−'}
                      </td>
                      <td className="p-2 text-sm">
                        {transaction.user_details?.name || 'N/A'}
                      </td>
                      <td className="p-2 text-center">
                        {transaction.fatura_foto ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleImageClick(transaction.fatura_foto!)}
                            className="h-8 w-8 p-0"
                            title="Fatura görüntüsünü aç"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td className="p-2 text-sm font-medium" colSpan={3}>
                      Toplam
                    </td>
                    <td className="p-2 text-right font-mono font-semibold">
                      {totalLiters.toFixed(2)} L
                    </td>
                    <td className="p-2" />
                    <td className="p-2" />
                    <td className="p-2 text-right font-mono font-semibold">
                      {formatCurrency(totalDiscount)}
                    </td>
                    <td className="p-2" />
                    <td className="p-2" />
                    <td className="p-2" />
                    <td className="p-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Fatura Görüntüsü
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {selectedImage && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Fatura"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==';
                    target.alt = 'Görüntü yüklenemedi';
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
