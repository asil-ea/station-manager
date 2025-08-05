'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Save, CheckCircle, AlertCircle, X, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface CleaningOperation {
  id: number;
  islem: string;
  aciklama?: string;
}

interface CleaningEntryFormProps {
  operations: CleaningOperation[];
  userId: string;
  userName?: string;
}

interface FormData {
  selectedOperations: number[];
  aciklama: string;
  photos: File[];
  timestamp: string;
}

export function CleaningEntryForm({ operations, userId, userName }: CleaningEntryFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    selectedOperations: [],
    aciklama: '',
    photos: [],
    timestamp: new Date().toISOString().slice(0, 16) // Default to current datetime in YYYY-MM-DDTHH:MM format
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOperationChange = (operationId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedOperations: checked 
        ? [...prev.selectedOperations, operationId]
        : prev.selectedOperations.filter(id => id !== operationId)
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.type.startsWith('image/')) {
        if (file.size <= 5 * 1024 * 1024) { // 5MB limit
          return true;
        } else {
          setError('Fotoğraf boyutu 5MB\'dan küçük olmalıdır.');
          return false;
        }
      } else {
        setError('Sadece resim dosyaları yükleyebilirsiniz.');
        return false;
      }
    });

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles]
    }));
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const uploadPhotos = async (photos: File[], cleaningLogId: number, staffName: string, timestamp: string): Promise<string[]> => {
    const supabase = createClient();
    const uploadedPaths: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const extension = photo.name.split('.').pop();
      const formattedDateTime = new Date(timestamp).toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const sanitizedStaffName = staffName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${formattedDateTime}_${sanitizedStaffName}_${cleaningLogId}_${i + 1}.${extension}`;
      
      const { data, error } = await supabase.storage
        .from('temizlik-foto')
        .upload(fileName, photo);

      if (error) {
        console.error('Photo upload error:', error);
        throw new Error(`Fotoğraf yükleme hatası: ${error.message}`);
      }

      if (data) {
        uploadedPaths.push(data.path);
      }
    }

    return uploadedPaths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (formData.selectedOperations.length === 0) {
        throw new Error('En az bir temizlik işlemi seçmelisiniz.');
      }

      // Validate timestamp
      const selectedDate = new Date(formData.timestamp);
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (selectedDate > now) {
        throw new Error('Gelecek bir tarih seçemezsiniz.');
      }

      if (selectedDate < oneWeekAgo) {
        throw new Error('Bir haftadan eski bir tarih seçemezsiniz.');
      }

      const supabase = createClient();

      // Insert the cleaning log first
      const { data: cleaningLog, error: logError } = await supabase
        .from('temizlik_gunluk')
        .insert({
          personel: userId,
          timestamp: new Date(formData.timestamp).toISOString(),
          aciklama: formData.aciklama || null
        })
        .select()
        .single();

      if (logError) {
        throw new Error(`Temizlik kaydı oluşturulamadı: ${logError.message}`);
      }

      // Insert the operations for this log
      const operationInserts = formData.selectedOperations.map(operationId => ({
        gunluk_id: cleaningLog.id,
        islem_id: operationId
      }));

      const { error: operationsError } = await supabase
        .from('temizlik_gunluk_islem')
        .insert(operationInserts);

      if (operationsError) {
        throw new Error(`Temizlik işlemleri kaydedilemedi: ${operationsError.message}`);
      }

      // Upload photos if any (now with proper naming)
      let photoPaths: string[] = [];
      if (formData.photos.length > 0) {
        photoPaths = await uploadPhotos(formData.photos, cleaningLog.id, userName || 'Unknown', formData.timestamp);
      }

      // Insert photos if any
      if (photoPaths.length > 0) {
        const photoInserts = photoPaths.map(photoPath => ({
          gunluk_id: cleaningLog.id,
          foto: photoPath,
          meta_timestamp: new Date(formData.timestamp).toISOString()
        }));

        const { error: photosError } = await supabase
          .from('temizlik_gunluk_foto')
          .insert(photoInserts);

        if (photosError) {
          throw new Error(`Fotoğraflar kaydedilemedi: ${photosError.message}`);
        }
      }

      setSuccess(true);
      setFormData({
        selectedOperations: [],
        aciklama: '',
        photos: [],
        timestamp: new Date().toISOString().slice(0, 16)
      });

      // Redirect after success
      setTimeout(() => {
        router.push('/staff');
      }, 2000);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Temizlik faaliyeti başarıyla kaydedildi!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Cleaning Operations Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Temizlik İşlemleri</Label>
        <p className="text-sm text-muted-foreground">
          Gerçekleştirdiğiniz temizlik işlemlerini seçin:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {operations.map((operation) => (
            <div key={operation.id} className="flex items-start space-x-3 p-3 border rounded-md">
              <Checkbox
                id={`operation-${operation.id}`}
                checked={formData.selectedOperations.includes(operation.id)}
                onCheckedChange={(checked) => 
                  handleOperationChange(operation.id, checked as boolean)
                }
              />
              <div className="space-y-1">
                <Label 
                  htmlFor={`operation-${operation.id}`} 
                  className="text-sm font-medium cursor-pointer"
                >
                  {operation.islem}
                </Label>
                {operation.aciklama && (
                  <p className="text-xs text-muted-foreground">
                    {operation.aciklama}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timestamp Input */}
      <div className="space-y-2">
        <Label htmlFor="timestamp" className="text-base font-medium">
          Tarih ve Saat
        </Label>
        <p className="text-sm text-muted-foreground">
          Temizlik faaliyetinin gerçekleştirildiği tarih ve saati seçin.
        </p>
        <Input
          type="datetime-local"
          id="timestamp"
          value={formData.timestamp}
          onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
        />
      </div>

      {/* Photos Upload */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Fotoğraflar (İsteğe Bağlı)</Label>
        <p className="text-sm text-muted-foreground">
          Temizlik faaliyetlerinin fotoğraflarını ekleyebilirsiniz.
        </p>
        
        <div className="grid gap-3">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              id="photos"
              multiple
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('photos')?.click()}
              className="flex items-center space-x-2"
            >
              <Camera className="h-4 w-4" />
              <span>Fotoğraf Ekle</span>
            </Button>
            <span className="text-xs text-muted-foreground">
              Maksimum 5MB, JPG/PNG
            </span>
          </div>

          {formData.photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Fotoğraf ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="aciklama" className="text-base font-medium">
          Açıklama (İsteğe Bağlı)
        </Label>
        <textarea
          id="aciklama"
          value={formData.aciklama}
          onChange={(e) => setFormData(prev => ({ ...prev, aciklama: e.target.value }))}
          placeholder="Ek açıklamalar..."
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || formData.selectedOperations.length === 0 || !formData.timestamp}
        className="w-full flex items-center justify-center space-x-2"
      >
        {isSubmitting ? (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <span>Kaydediliyor...</span>
          </div>
        ) : (
          <>
            <Save className="h-4 w-4" />
            <span>Temizlik Faaliyetini Kaydet</span>
          </>
        )}
      </Button>
    </form>
  );
}
