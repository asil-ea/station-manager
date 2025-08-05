'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PlateData {
  plaka: string;
  oran_nakit: number;
  oran_kredi: number;
  aciklama: string;
  aktif: boolean;
}

export function AddPlateDialog() {
  const router = useRouter();
  const [newPlateData, setNewPlateData] = useState<PlateData>({
    plaka: '',
    oran_nakit: 0,
    oran_kredi: 0,
    aciklama: '',
    aktif: true
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const formatPlateNumber = (value: string) => {
    return value.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!newPlateData.plaka.trim()) {
        throw new Error("Plaka numarası zorunludur");
      }
      
      if (newPlateData.oran_nakit < 0 || newPlateData.oran_nakit > 100) {
        throw new Error("Nakit iskonto oranı 0-100 arasında olmalıdır");
      }

      if (newPlateData.oran_kredi < 0 || newPlateData.oran_kredi > 100) {
        throw new Error("Kredi kartı iskonto oranı 0-100 arasında olmalıdır");
      }

      // Check if plate already exists
      const { data: existingPlate } = await supabase
        .from('iskonto_listesi')
        .select('id')
        .eq('plaka', newPlateData.plaka.trim())
        .single();
      
      if (existingPlate) {
        throw new Error("Bu plaka zaten sistemde kayıtlı");
      }

      // Insert new plate
      const { error: insertError } = await supabase
        .from('iskonto_listesi')
        .insert({
          plaka: newPlateData.plaka.trim(),
          oran_nakit: newPlateData.oran_nakit,
          oran_kredi: newPlateData.oran_kredi,
          aciklama: newPlateData.aciklama.trim() || null,
          aktif: newPlateData.aktif
        });

      if (insertError) {
        throw new Error("Plaka eklenirken bir hata oluştu: " + insertError.message);
      }

      setSuccess("Plaka başarıyla eklendi!");
      setNewPlateData({
        plaka: '',
        oran_nakit: 0,
        oran_kredi: 0,
        aciklama: '',
        aktif: true
      });
      setIsModalOpen(false);
      
      // Refresh the page to show updated data
      router.refresh();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button className="mb-6">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Plaka Ekle
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Yeni Plaka Ekle
            </DialogTitle>
            <DialogDescription>
              Sisteme yeni bir plaka ekleyin ve nakit ile kredi kartı ödemeler için ayrı iskonto oranları belirleyin.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-plaka">Plaka Numarası</Label>
                <Input
                  id="new-plaka"
                  type="text"
                  placeholder="ör: 34 ABC 123"
                  value={newPlateData.plaka}
                  onChange={(e) => setNewPlateData(prev => ({ 
                    ...prev, 
                    plaka: formatPlateNumber(e.target.value) 
                  }))}
                  maxLength={10}
                  className="font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-oran-nakit">Nakit İskonto Oranı (%)</Label>
                <Input
                  id="new-oran-nakit"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="ör: 5.5"
                  value={newPlateData.oran_nakit === 0 ? '0' : newPlateData.oran_nakit || ''}
                  onChange={(e) => setNewPlateData(prev => ({ 
                    ...prev, 
                    oran_nakit: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                  }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-oran-kredi">Kredi Kartı İskonto Oranı (%)</Label>
                <Input
                  id="new-oran-kredi"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="ör: 3.0"
                  value={newPlateData.oran_kredi === 0 ? '0' : newPlateData.oran_kredi || ''}
                  onChange={(e) => setNewPlateData(prev => ({ 
                    ...prev, 
                    oran_kredi: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                  }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-aciklama">Açıklama (İsteğe bağlı)</Label>
              <Input
                id="new-aciklama"
                type="text"
                placeholder="ör: Kurumsal müşteri, VIP üye, vs."
                value={newPlateData.aciklama}
                onChange={(e) => setNewPlateData(prev => ({ 
                  ...prev, 
                  aciklama: e.target.value 
                }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-aktif"
                checked={newPlateData.aktif}
                onCheckedChange={(checked) => setNewPlateData(prev => ({ 
                  ...prev, 
                  aktif: checked === true 
                }))}
              />
              <Label htmlFor="new-aktif" className="text-sm">
                Aktif (İskonto uygulanabilir)
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
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
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
