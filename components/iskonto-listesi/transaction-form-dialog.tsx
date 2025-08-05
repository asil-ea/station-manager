'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calculator, Image as ImageIcon, FileText } from "lucide-react";
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
  gasType: 'Motorin' | 'Benzin' | 'LPG';
  liters: number;
  pricePerLiter: number;
  totalPriceBeforeDiscount: number;
  totalPriceAfterDiscount: number;
  receiptPhoto: File | null;
  receiptPhotoUrl: string | null;
  notes: string;
}

interface TransactionFormDialogProps {
  user: any; // User object from Supabase
  isOpen: boolean;
  onClose: () => void;
  result: DiscountResult;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function TransactionFormDialog({ 
  user,
  isOpen, 
  onClose, 
  result, 
  onSuccess,
  onError 
}: TransactionFormDialogProps) {
  const supabase = createClient();
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
    setIsUploadingPhoto(true);
    try {
      const fileName = generateFileName(result.plaka, transactionId, file);
      //eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.storage
        .from('iskonto-fatura')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        onError("Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('iskonto-fatura')
        .getPublicUrl(fileName);

      return { fileName, publicUrl };
    } catch (err) {
      console.error('Photo upload error:', err);
      onError("Fotoğraf yüklenirken hata oluştu.");
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
      onError("Sadece JPG, PNG ve WebP formatlarında fotoğraf yükleyebilirsiniz.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError("Fotoğraf boyutu 10MB'dan küçük olmalıdır.");
      return;
    }

    // Just store the file locally, don't upload yet
    setTransaction(prev => ({
      ...prev,
      receiptPhoto: file,
      receiptPhotoUrl: null // Clear any previous URL
    }));
  };

  const handleTransactionChange = (field: keyof TransactionData, value: any) => {
    const updatedTransaction = { ...transaction, [field]: value };
    
    // Auto-calculate prices when liters or price per liter changes
    if (field === 'liters' || field === 'pricePerLiter') {
      if (updatedTransaction.liters > 0 && updatedTransaction.pricePerLiter > 0) {
        updatedTransaction.totalPriceBeforeDiscount = updatedTransaction.liters * updatedTransaction.pricePerLiter;
        
        updatedTransaction.totalPriceAfterDiscount = calculateDiscountedPrice(
          updatedTransaction.totalPriceBeforeDiscount,
          result.oran
        );
      }
    }
    
    setTransaction(updatedTransaction);
  };

  const handleSubmitTransaction = async () => {
    if (transaction.liters <= 0 || transaction.pricePerLiter <= 0) {
      onError("Lütfen tüm alanları doğru şekilde doldurun.");
      return;
    }

    setIsSubmittingTransaction(true);

    try {
      if (!user) {
        onError("Kullanıcı bilgisi alınamadı. Lütfen tekrar giriş yapın.");
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
        personel: user.sub
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
        onError("İşlem kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }

      // If transaction was successful and there's a photo, upload it
      let fileName = null;
      if (transaction.receiptPhoto && transactionData) {
        setIsUploadingPhoto(true);
        const uploadResult = await handlePhotoUpload(transaction.receiptPhoto, transactionData.id);
        setIsUploadingPhoto(false);
        
        if (uploadResult) {
          fileName = uploadResult.fileName;
          
          // Update the transaction record with the photo filename
          const { error: updateError } = await supabase
            .from('iskonto_alisveris')
            .update({ fatura_foto: fileName })
            .eq('id', transactionData.id);

          if (updateError) {
            console.error('Photo filename update error:', updateError);
            // Don't fail the transaction for photo filename update failure
          }
        }
      }

      // Update local state to show photo was uploaded
      if (fileName) {
        setTransaction(prev => ({ ...prev, receiptPhotoUrl: fileName }));
      }

      onSuccess();
      onClose();
      
      // Reset form
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
    } catch (err) {
      console.error('Submit error:', err);
      onError("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmittingTransaction(false);
      setIsUploadingPhoto(false);
    }
  };

  const handleDialogClose = () => {
    if (!isSubmittingTransaction) {
      onClose();
      // Reset form
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
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-800">Satış İşlemi</DialogTitle>
          <DialogDescription>
            {result.plaka} plakası için {result.oran}% iskontolu satış
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
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
              <Button
                variant={transaction.gasType === 'LPG' ? 'default' : 'outline'}
                onClick={() => handleTransactionChange('gasType', 'LPG')}
                className="flex-1"
              >
                LPG
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
            <div className="p-4 bg-muted rounded-lg border">
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
              onClick={handleDialogClose}
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
      </DialogContent>
    </Dialog>
  );
}
