'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Edit, Percent, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ExistingPlate {
  id: number;
  plaka: string;
  oran_nakit: number;
  oran_kredi: number;
  aciklama: string | null;
  aktif: boolean;
  created_at: string;
}

interface PlateItemProps {
  plate: ExistingPlate;
}

export function PlateItem({ plate }: PlateItemProps) {
  const router = useRouter();
  const [editingPlate, setEditingPlate] = useState<ExistingPlate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const handleEditPlate = async (plateToUpdate: ExistingPlate) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (plateToUpdate.oran_nakit < 0 || plateToUpdate.oran_nakit > 100) {
        throw new Error("Nakit iskonto oranı 0-100 arasında olmalıdır");
      }

      if (plateToUpdate.oran_kredi < 0 || plateToUpdate.oran_kredi > 100) {
        throw new Error("Kredi kartı iskonto oranı 0-100 arasında olmalıdır");
      }

      // Update plate
      const { error: updateError } = await supabase
        .from('iskonto_listesi')
        .update({
          oran_nakit: plateToUpdate.oran_nakit,
          oran_kredi: plateToUpdate.oran_kredi,
          aciklama: plateToUpdate.aciklama?.trim() || null,
          aktif: plateToUpdate.aktif
        })
        .eq('id', plateToUpdate.id);

      if (updateError) {
        throw new Error("Plaka güncellenirken bir hata oluştu: " + updateError.message);
      }

      setSuccess("Plaka başarıyla güncellendi!");
      setEditingPlate(null);
      
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
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

      <Card className="border">
        <CardContent className="p-4">
          {editingPlate?.id === plate.id ? (
            // Edit mode
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Plaka Numarası</Label>
                  <Input
                    value={editingPlate.plaka}
                    disabled
                    className="font-mono bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nakit İskonto Oranı (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editingPlate.oran_nakit === 0 ? '0' : editingPlate.oran_nakit || ''}
                    onChange={(e) => setEditingPlate(prev => prev ? ({ 
                      ...prev, 
                      oran_nakit: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                    }) : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kredi Kartı İskonto Oranı (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editingPlate.oran_kredi === 0 ? '0' : editingPlate.oran_kredi || ''}
                    onChange={(e) => setEditingPlate(prev => prev ? ({ 
                      ...prev, 
                      oran_kredi: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                    }) : null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Input
                  value={editingPlate.aciklama || ''}
                  onChange={(e) => setEditingPlate(prev => prev ? ({ 
                    ...prev, 
                    aciklama: e.target.value 
                  }) : null)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editingPlate.aktif}
                  onCheckedChange={(checked) => setEditingPlate(prev => prev ? ({ 
                    ...prev, 
                    aktif: checked === true 
                  }) : null)}
                />
                <Label className="text-sm">Aktif</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleEditPlate(editingPlate)}
                  disabled={isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingPlate(null)}
                  disabled={isSubmitting}
                  size="sm"
                >
                  İptal
                </Button>
              </div>
            </div>
          ) : (
            // View mode
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-base px-3 py-1">
                    {plate.plaka}
                  </Badge>
                  <Badge variant={plate.aktif ? "default" : "secondary"}>
                    {plate.aktif ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Percent className="h-4 w-4" />
                    Nakit: %{plate.oran_nakit}
                  </span>
                  <span className="flex items-center gap-1">
                    <Percent className="h-4 w-4" />
                    Kredi: %{plate.oran_kredi}
                  </span>
                  <span>Eklenme: {formatDate(plate.created_at)}</span>
                </div>
                {plate.aciklama && (
                  <p className="text-sm text-muted-foreground">
                    {plate.aciklama}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPlate(plate)}
                disabled={isSubmitting}
              >
                <Edit className="h-4 w-4 mr-2" />
                Düzenle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
