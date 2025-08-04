'use client';

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Edit, 
  Search,
  Car,
  Percent,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PlateData {
  id?: number;
  plaka: string;
  oran: number;
  aciklama: string;
  aktif: boolean;
}

interface ExistingPlate {
  id: number;
  plaka: string;
  oran: number;
  aciklama: string | null;
  aktif: boolean;
  created_at: string;
}

export function PlateManagement() {
  // State for new plate form
  const [newPlateData, setNewPlateData] = useState<PlateData>({
    plaka: '',
    oran: 0,
    aciklama: '',
    aktif: true
  });
  
  // State for existing plates
  const [existingPlates, setExistingPlates] = useState<ExistingPlate[]>([]);
  const [filteredPlates, setFilteredPlates] = useState<ExistingPlate[]>([]);
  const [editingPlate, setEditingPlate] = useState<ExistingPlate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const fetchPlates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('iskonto_listesi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error("Plakalar yüklenirken hata oluştu: " + error.message);
      }

      setExistingPlates(data || []);
      setFilteredPlates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...existingPlates];

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(plate => 
        plate.plaka.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plate.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(plate => plate.aktif);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(plate => !plate.aktif);
    }

    setFilteredPlates(filtered);
  };

  useEffect(() => {
    fetchPlates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, existingPlates]);

  const formatPlateNumber = (value: string) => {
    return value.toUpperCase();
  };

  const handleNewPlateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!newPlateData.plaka.trim()) {
        throw new Error("Plaka numarası zorunludur");
      }
      
      if (newPlateData.oran < 0 || newPlateData.oran > 100) {
        throw new Error("İskonto oranı 0-100 arasında olmalıdır");
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
          oran: newPlateData.oran,
          aciklama: newPlateData.aciklama.trim() || null,
          aktif: newPlateData.aktif
        });

      if (insertError) {
        throw new Error("Plaka eklenirken bir hata oluştu: " + insertError.message);
      }

      setSuccess("Plaka başarıyla eklendi!");
      setNewPlateData({
        plaka: '',
        oran: 0,
        aciklama: '',
        aktif: true
      });
      setIsModalOpen(false); // Close modal after successful submission
      
      // Refresh the list
      await fetchPlates();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPlate = async (plate: ExistingPlate) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (plate.oran < 0 || plate.oran > 100) {
        throw new Error("İskonto oranı 0-100 arasında olmalıdır");
      }

      // Update plate
      const { error: updateError } = await supabase
        .from('iskonto_listesi')
        .update({
          oran: plate.oran,
          aciklama: plate.aciklama?.trim() || null,
          aktif: plate.aktif
        })
        .eq('id', plate.id);

      if (updateError) {
        throw new Error("Plaka güncellenirken bir hata oluştu: " + updateError.message);
      }

      setSuccess("Plaka başarıyla güncellendi!");
      setEditingPlate(null);
      
      // Refresh the list
      await fetchPlates();
      
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
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Add New Plate Modal */}
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
              Sisteme yeni bir plaka ekleyin ve iskonto oranını belirleyin.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleNewPlateSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
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
                <Label htmlFor="new-oran">İskonto Oranı (%)</Label>
                <Input
                  id="new-oran"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="ör: 5.5"
                  value={newPlateData.oran === 0 ? '0' : newPlateData.oran || ''}
                  onChange={(e) => setNewPlateData(prev => ({ 
                    ...prev, 
                    oran: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
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

      {/* Existing Plates Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Mevcut Plakalar
          </CardTitle>
          <CardDescription>
            Sistemdeki mevcut plakaları görüntüleyin ve iskonto oranlarını düzenleyin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Plaka veya Açıklama Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Plaka veya açıklama ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <Label htmlFor="status-filter">Durum Filtresi</Label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tümü</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredPlates.length} plaka bulundu (toplam {existingPlates.length} plaka)
            </p>
            <Button variant="outline" onClick={fetchPlates} disabled={isLoading}>
              Yenile
            </Button>
          </div>

          {/* Plates List */}
          {isLoading ? (
            <div className="text-center py-8">
              <p>Plakalar yükleniyor...</p>
            </div>
          ) : filteredPlates.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {existingPlates.length === 0 ? "Henüz plaka bulunmuyor" : "Filtreye uygun plaka bulunamadı"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlates.map((plate) => (
                <Card key={plate.id} className="border">
                  <CardContent className="p-4">
                    {editingPlate?.id === plate.id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Plaka Numarası</Label>
                            <Input
                              value={editingPlate.plaka}
                              disabled
                              className="font-mono bg-muted"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>İskonto Oranı (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editingPlate.oran === 0 ? '0' : editingPlate.oran || ''}
                              onChange={(e) => setEditingPlate(prev => prev ? ({ 
                                ...prev, 
                                oran: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
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
                              %{plate.oran} iskonto
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
