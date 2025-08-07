'use client';

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Car, Edit, Check, X, Percent, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PlateFilters } from "./plate-filters";

interface ExistingPlate {
  id: number;
  plaka: string;
  oran_nakit: number;
  oran_kredi: number;
  aciklama: string | null;
  aktif: boolean;
  created_at: string;
}

interface PlateListProps {
  initialPlates: ExistingPlate[];
}

export function PlateList({ initialPlates }: PlateListProps) {
  const [existingPlates, setExistingPlates] = useState<ExistingPlate[]>(initialPlates);
  const [filteredPlates, setFilteredPlates] = useState<ExistingPlate[]>(initialPlates);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlate, setEditingPlate] = useState<ExistingPlate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

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

      const { error } = await supabase
        .from('iskonto_listesi')
        .update({
          oran_nakit: plateToUpdate.oran_nakit,
          oran_kredi: plateToUpdate.oran_kredi,
          aciklama: plateToUpdate.aciklama,
          aktif: plateToUpdate.aktif,
        })
        .eq('id', plateToUpdate.id);

      if (error) {
        throw new Error("Plaka güncellenirken hata oluştu: " + error.message);
      }

      // Update local state
      setExistingPlates(prev => prev.map(p => 
        p.id === plateToUpdate.id ? plateToUpdate : p
      ));
      
      setEditingPlate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    } catch (err) {
      console.error('Error fetching plates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
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
  }, [existingPlates, searchTerm, statusFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Mevcut Plakalar
        </CardTitle>
        <CardDescription>
          Sistemdeki mevcut plakaları görüntüleyin ve nakit ile kredi kartı iskonto oranlarını düzenleyin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <PlateFilters
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredPlates.length} plaka bulundu (toplam {existingPlates.length} plaka)
          </p>
          <Button variant="outline" onClick={fetchPlates} disabled={isLoading}>
            Yenile
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Plates Table */}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plaka</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Nakit İskonto (%)</TableHead>
                <TableHead>Kredi İskonto (%)</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Eklenme Tarihi</TableHead>
                <TableHead className="w-[100px]">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlates.map((plate) => (
                <TableRow key={plate.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {plate.plaka}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingPlate?.id === plate.id ? (
                      <Checkbox
                        checked={editingPlate.aktif}
                        onCheckedChange={(checked) => setEditingPlate(prev => prev ? ({ 
                          ...prev, 
                          aktif: checked === true 
                        }) : null)}
                      />
                    ) : (
                      <Badge variant={plate.aktif ? "default" : "secondary"}>
                        {plate.aktif ? "Aktif" : "Pasif"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingPlate?.id === plate.id ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-20"
                        value={editingPlate.oran_nakit === 0 ? '0' : editingPlate.oran_nakit || ''}
                        onChange={(e) => setEditingPlate(prev => prev ? ({ 
                          ...prev, 
                          oran_nakit: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                        }) : null)}
                      />
                    ) : (
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {plate.oran_nakit}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingPlate?.id === plate.id ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-20"
                        value={editingPlate.oran_kredi === 0 ? '0' : editingPlate.oran_kredi || ''}
                        onChange={(e) => setEditingPlate(prev => prev ? ({ 
                          ...prev, 
                          oran_kredi: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 
                        }) : null)}
                      />
                    ) : (
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {plate.oran_kredi}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingPlate?.id === plate.id ? (
                      <Input
                        value={editingPlate.aciklama || ''}
                        onChange={(e) => setEditingPlate(prev => prev ? ({ 
                          ...prev, 
                          aciklama: e.target.value 
                        }) : null)}
                        className="min-w-[150px]"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {plate.aciklama || '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(plate.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {editingPlate?.id === plate.id ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleEditPlate(editingPlate)}
                          disabled={isSubmitting}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPlate(null)}
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlate(plate)}
                        disabled={isSubmitting}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
