'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Percent, AlertCircle, CheckCircle, ShoppingCart, Calculator, Upload, Image as ImageIcon, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DiscountResult {
  id: number;
  plaka: string;
  oran: number;
  aciklama: string | null;
  aktif: boolean;
  created_at: string;
}

interface TransactionData {
  gasType: 'Motorin' | 'Benzin';
  liters: number;
  pricePerLiter: number;
  totalPriceBeforeDiscount: number;
  totalPriceAfterDiscount: number;
  receiptPhoto: File | null;
  receiptPhotoUrl: string | null;
  notes: string;
}

export function PlateDiscountSearch() {
  const [plateNumber, setPlateNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<DiscountResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Transaction form states
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transaction, setTransaction] = useState<TransactionData>({
    gasType: 'Motorin',
    liters: 0,
    pricePerLiter: 0,
    totalPriceBeforeDiscount: 0,
    totalPriceAfterDiscount: 0,
    receiptPhoto: null,
    receiptPhotoUrl: null,
    notes: ''
  });
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

  const calculateDiscountedPrice = (originalPrice: number, discountRate: number) => {
    return originalPrice * (1 - discountRate / 100);
  };

  const generateFileName = (plateNumber: string, transactionId: number, file: File) => {
    const now = new Date();
    const datetime = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: YYYY-MM-DDTHH-MM-SS
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    return `${plateNumber}_${transactionId}_${datetime}.${extension}`;
  };

  const handlePhotoUpload = async (file: File, transactionId: number) => {
    if (!result) return null;

    setIsUploadingPhoto(true);
    try {
      const fileName = generateFileName(result.plaka, transactionId, file);
      const { data, error } = await supabase.storage
        .from('iskonto-fatura')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        setError("Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('iskonto-fatura')
        .getPublicUrl(fileName);

      return { fileName, publicUrl };
    } catch (err) {
      console.error('Photo upload error:', err);
      setError("Fotoğraf yüklenirken hata oluştu.");
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError("Sadece JPG, PNG ve WebP formatlarında fotoğraf yükleyebilirsiniz.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Fotoğraf boyutu 10MB'dan küçük olmalıdır.");
      return;
    }

    // Just store the file locally, don't upload yet
    setTransaction(prev => ({
      ...prev,
      receiptPhoto: file,
      receiptPhotoUrl: null // Clear any previous URL
    }));
    setError(null);
  };

  const handleTransactionChange = (field: keyof TransactionData, value: any) => {
    const updatedTransaction = { ...transaction, [field]: value };
    
    // Auto-calculate prices when liters or price per liter changes
    if (field === 'liters' || field === 'pricePerLiter') {
      if (updatedTransaction.liters > 0 && updatedTransaction.pricePerLiter > 0) {
        updatedTransaction.totalPriceBeforeDiscount = updatedTransaction.liters * updatedTransaction.pricePerLiter;
        
        if (result) {
          updatedTransaction.totalPriceAfterDiscount = calculateDiscountedPrice(
            updatedTransaction.totalPriceBeforeDiscount,
            result.oran
          );
        }
      }
    }
    
    setTransaction(updatedTransaction);
  };

  const handleStartTransaction = () => {
    setShowTransactionForm(true);
    setTransactionSuccess(false);
    // Reset transaction form
    setTransaction({
      gasType: 'Motorin',
      liters: 0,
      pricePerLiter: 0,
      totalPriceBeforeDiscount: 0,
      totalPriceAfterDiscount: 0,
      receiptPhoto: null,
      receiptPhotoUrl: null,
      notes: ''
    });
  };

  const handleSubmitTransaction = async () => {
    if (!result || transaction.liters <= 0 || transaction.pricePerLiter <= 0) {
      setError("Lütfen tüm alanları doğru şekilde doldurun.");
      return;
    }

    setIsSubmittingTransaction(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError("Kullanıcı bilgisi alınamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      // First, save the transaction without photo
      const insertData: any = {
        musteri: result.id,
        alis_tip: transaction.gasType,
        alis_litre: transaction.liters,
        alis_tutar: transaction.totalPriceBeforeDiscount,
        iskonto_oran: result.oran,
        net_tutar: transaction.totalPriceAfterDiscount,
        litre_fiyat: transaction.pricePerLiter,
        personel: user.id
      };

      // Add notes if available
      if (transaction.notes.trim()) {
        insertData.aciklama = transaction.notes.trim();
      }

      const { data: transactionData, error: supabaseError } = await supabase
        .from('iskonto_alisveris')
        .insert(insertData)
        .select()
        .single();

      if (supabaseError) {
        console.error('Transaction error:', supabaseError);
        setError("İşlem kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }

      // If transaction was successful and there's a photo, upload it
      let photoUrl = null;
      if (transaction.receiptPhoto && transactionData) {
        setIsUploadingPhoto(true);
        const uploadResult = await handlePhotoUpload(transaction.receiptPhoto, transactionData.id);
        setIsUploadingPhoto(false);
        
        if (uploadResult) {
          photoUrl = uploadResult.publicUrl;
          
          // Update the transaction record with the photo URL
          const { error: updateError } = await supabase
            .from('iskonto_alisveris')
            .update({ fatura_foto_url: photoUrl })
            .eq('id', transactionData.id);

          if (updateError) {
            console.error('Photo URL update error:', updateError);
            // Don't fail the transaction for photo URL update failure
          }
        }
      }

      // Update local state to show photo was uploaded
      if (photoUrl) {
        setTransaction(prev => ({ ...prev, receiptPhotoUrl: photoUrl }));
      }

      setTransactionSuccess(true);
      setShowTransactionForm(false);
    } catch (err) {
      console.error('Submit error:', err);
      setError("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmittingTransaction(false);
      setIsUploadingPhoto(false);
    }
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
                {transaction.gasType} satışı başarıyla sisteme kaydedildi.
                {transaction.receiptPhotoUrl && " Fiş fotoğrafı da yüklendi."}
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
                  <div className="flex items-center gap-2 text-3xl font-bold text-green-600">
                    <Percent className="h-6 w-6" />
                    {result.oran}
                  </div>
                  <div className="text-sm text-muted-foreground">iskonto oranı</div>
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
                  disabled={showTransactionForm}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Satış İşlemi Başlat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Form */}
      {showTransactionForm && result && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Satış İşlemi</CardTitle>
            <CardDescription>
              {result.plaka} plakası için {result.oran}% iskontolu satış
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {/* Gas Type Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Yakıt Türü</label>
                <div className="flex gap-2">
                  <Button
                    variant={transaction.gasType === 'Motorin' ? 'default' : 'outline'}
                    onClick={() => handleTransactionChange('gasType', 'Motorin')}
                    className="flex-1"
                  >
                    Motorin
                  </Button>
                  <Button
                    variant={transaction.gasType === 'Benzin' ? 'default' : 'outline'}
                    onClick={() => handleTransactionChange('gasType', 'Benzin')}
                    className="flex-1"
                  >
                    Benzin
                  </Button>
                </div>
              </div>

              {/* Liters Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">Litre</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transaction.liters || ''}
                  onChange={(e) => handleTransactionChange('liters', parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Price Per Liter Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">Litre Fiyatı</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={transaction.pricePerLiter || ''}
                    onChange={(e) => handleTransactionChange('pricePerLiter', parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">₺/L</span>
                </div>
              </div>

              {/* Total Price Before Discount (Calculated) */}
              <div>
                <label className="text-sm font-medium mb-2 block">Toplam Fiyat (İndirim Öncesi)</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={transaction.totalPriceBeforeDiscount.toFixed(2)}
                    readOnly
                    className="bg-muted"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">₺</span>
                </div>
              </div>

              {/* Price After Discount (Calculated) */}
              <div>
                <label className="text-sm font-medium mb-2 block">Net Fiyat (İndirim Sonrası)</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={transaction.totalPriceAfterDiscount.toFixed(2)}
                    readOnly
                    className="bg-muted"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">₺</span>
                </div>
              </div>

              {/* Discount Summary */}
              {transaction.totalPriceBeforeDiscount > 0 && (
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">İndirim Özeti</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">İndirim Oranı:</span>
                      <div className="font-semibold">{result.oran}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">İndirim Tutarı:</span>
                      <div className="font-semibold text-red-600">
                        -{(transaction.totalPriceBeforeDiscount - transaction.totalPriceAfterDiscount).toFixed(2)} ₺
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Photo Upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">Fiş Fotoğrafı (İsteğe Bağlı)</label>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileChange}
                      disabled={isUploadingPhoto}
                      className="cursor-pointer"
                    />
                    {isUploadingPhoto && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {transaction.receiptPhoto && !isUploadingPhoto && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                      <ImageIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        {transaction.receiptPhoto.name} seçildi
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTransaction(prev => ({ 
                          ...prev, 
                          receiptPhoto: null, 
                          receiptPhotoUrl: null 
                        }))}
                        className="ml-auto h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </Button>
                    </div>
                  )}

                  {isUploadingPhoto && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-md border border-yellow-200">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      <span className="text-sm text-yellow-700">
                        Fotoğraf yükleniyor...
                      </span>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG veya WebP formatında, maksimum 10MB. Fotoğraf işlem kaydedildiğinde yüklenecek.
                  </p>
                </div>
              </div>

              {/* Notes/Description */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Notlar (İsteğe Bağlı)
                </label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
                  placeholder="İşlemle ilgili notlar veya açıklamalar..."
                  value={transaction.notes}
                  onChange={(e) => handleTransactionChange('notes', e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {transaction.notes.length}/500 karakter
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTransactionForm(false)}
                  className="flex-1"
                  disabled={isSubmittingTransaction}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSubmitTransaction}
                  className="flex-1"
                  disabled={isSubmittingTransaction || transaction.liters <= 0 || transaction.pricePerLiter <= 0}
                >
                  {isSubmittingTransaction ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {isUploadingPhoto ? 'Fotoğraf Yükleniyor...' : 'Kaydediliyor...'}
                    </div>
                  ) : (
                    'İşlemi Kaydet'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
