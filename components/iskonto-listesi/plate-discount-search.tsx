'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, CheckCircle, ShoppingCart, CreditCard, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TransactionFormDialog } from "./transaction-form-dialog";

interface DiscountResult {
  id: number;
  plaka: string;
  oran_nakit: number;
  oran_kredi: number;
  aciklama: string | null;
  aktif: boolean;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PlateDiscountSearch({ user }: { user: any }) {
  const [plateNumber, setPlateNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<DiscountResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Transaction dialog states
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  const supabase = createClient();

  const handleSearch = async () => {
    if (!plateNumber.trim()) {
      setError("Plaka numarası girmelisiniz.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setResult(null);
    setHasSearched(false);

    try {
      const { data, error: supabaseError } = await supabase
        .from('iskonto_listesi')
        .select('*')
        .eq('plaka', plateNumber.trim().toUpperCase())
        .eq('aktif', true)
        .single();

      if (supabaseError) {
        if (supabaseError.code === 'PGRST116') {
          // No rows found
          setResult(null);
          setError(null);
        } else {
          console.error('Supabase error:', supabaseError);
          setError("Arama sırasında bir hata oluştu. Lütfen tekrar deneyin.");
        }
      } else {
        setResult(data);
        setError(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatPlateNumber = (value: string) => {
    // Remove spaces and convert to uppercase
    return value.replace(/\s/g, '').toUpperCase();
  };

  const handleStartTransaction = () => {
    setShowTransactionDialog(true);
    setTransactionSuccess(false);
  };

  const handleTransactionSuccess = () => {
    setTransactionSuccess(true);
    setShowTransactionDialog(false);
  };

  const handleTransactionError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Plaka numarası (ör: 34ABC123)"
            value={plateNumber}
            onChange={(e) => setPlateNumber(formatPlateNumber(e.target.value))}
            onKeyPress={handleKeyPress}
            className="text-lg"
            disabled={isSearching}
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !plateNumber.trim()}
          size="lg"
        >
          {isSearching ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Aranıyor...
            </div>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Ara
            </>
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Success */}
      {transactionSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">İşlem Başarıyla Kaydedildi!</h3>
              <p className="text-green-700">
                Satış işlemi başarıyla sisteme kaydedildi.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Result Found */}
      {hasSearched && !result && !error && (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aktif İskonto Bulunamadı</h3>
              <p className="text-muted-foreground">
                <strong>{plateNumber}</strong> plakası için aktif bir iskonto kaydı bulunamadı.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Result */}
      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-800">Aktif İskonto Bulundu!</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {result.aktif ? 'Aktif' : 'Pasif'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div>
                  <div className="text-sm text-muted-foreground">Plaka</div>
                  <div className="text-lg font-semibold">{result.plaka}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Açıklama</div>
                  <div className="text-sm max-w-xs text-right">
                    {result.aciklama || 'Açıklama bulunmuyor'}
                  </div>
                </div>
              </div>

              {/* Discount Rates Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <div className="text-sm text-muted-foreground">Nakit Ödeme</div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">%{result.oran_nakit}</div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <div className="text-sm text-muted-foreground">Kredi Kartı</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">%{result.oran_kredi}</div>
                </div>
              </div>

              {result.aciklama && (
                <div className="p-4 bg-white rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Açıklama</div>
                  <div className="text-sm">{result.aciklama}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Durum</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${result.aktif ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium">{result.aktif ? 'Aktif' : 'Pasif'}</span>
                  </div>
                </div>
                
                <div className="p-4 bg-white rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">Kayıt Tarihi</div>
                  <div className="text-sm">
                    {new Date(result.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {/* Transaction Button */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleStartTransaction} 
                  className="w-full"
                  size="lg"
                  disabled={showTransactionDialog}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Satış İşlemi Başlat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Form Dialog */}
      {result && (
        <TransactionFormDialog
          user={user}
          isOpen={showTransactionDialog}
          onClose={() => setShowTransactionDialog(false)}
          result={result}
          onSuccess={handleTransactionSuccess}
          onError={handleTransactionError}
        />
      )}
    </div>
  );
}
