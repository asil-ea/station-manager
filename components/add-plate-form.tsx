'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PlateData {
  plaka: string;
  oran: number;
  aciklama: string;
  aktif: boolean;
}

export function AddPlateForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<PlateData>({
    plaka: '',
    oran: 0,
    aciklama: '',
    aktif: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatPlateNumber = (value: string) => {
    // Only convert to uppercase
    return value.toUpperCase();
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlateNumber(e.target.value);
    setFormData(prev => ({ ...prev, plaka: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!formData.plaka.trim()) {
        throw new Error("Plaka numarası zorunludur");
      }
      
      if (formData.oran < 0 || formData.oran > 100) {
        throw new Error("İskonto oranı 0-100 arasında olmalıdır");
      }

      const supabase = createClient();
      
      // Check if plate already exists
      const { data: existingPlate } = await supabase
        .from('iskonto_listesi')
        .select('id')
        .eq('plaka', formData.plaka.trim())
        .single();
      
      if (existingPlate) {
        throw new Error("Bu plaka zaten sistemde kayıtlı");
      }

      // Insert new plate
      const { error: insertError } = await supabase
        .from('iskonto_listesi')
        .insert({
          plaka: formData.plaka.trim(),
          oran: formData.oran,
          aciklama: formData.aciklama.trim() || null,
          aktif: formData.aktif
        });

      if (insertError) {
        throw new Error("Plaka eklenirken bir hata oluştu: " + insertError.message);
      }

      setSuccess(true);
      
      // Reset form after 2 seconds and redirect
      setTimeout(() => {
        setFormData({
          plaka: '',
          oran: 0,
          aciklama: '',
          aktif: true
        });
        setSuccess(false);
        router.push('/admin');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-green-600 mb-2">Başarılı!</h3>
          <p className="text-muted-foreground text-center">
            Plaka başarıyla sisteme eklendi. Admin paneline yönlendiriliyorsunuz...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plaka Bilgileri</CardTitle>
        <CardDescription>
          Aşağıdaki formu doldurarak sisteme yeni bir plaka ekleyebilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plaka">Plaka Numarası</Label>
            <Input
              id="plaka"
              type="text"
              placeholder="ör: 34 ABC 123"
              value={formData.plaka}
              onChange={handlePlateChange}
              maxLength={10}
              className="font-mono"
              required
            />
            <p className="text-xs text-muted-foreground">
              Türk plaka formatında giriniz (34 ABC 123)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="oran">İskonto Oranı (%)</Label>
            <Input
              id="oran"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="ör: 5.5"
              value={formData.oran || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                oran: parseFloat(e.target.value) || 0 
              }))}
              required
            />
            <p className="text-xs text-muted-foreground">
              0-100 arası bir değer giriniz
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama (İsteğe bağlı)</Label>
            <Input
              id="aciklama"
              type="text"
              placeholder="ör: Kurumsal müşteri, VIP üye, vs."
              value={formData.aciklama}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                aciklama: e.target.value 
              }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="aktif"
              checked={formData.aktif}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                aktif: checked === true 
              }))}
            />
            <Label htmlFor="aktif" className="text-sm">
              Aktif (İskonto uygulanabilir)
            </Label>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                "Kaydediliyor..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Plaka Ekle
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin')}
              disabled={isSubmitting}
            >
              İptal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
