'use client';

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PlateFilters } from "./plate-filters";
import { PlateItem } from "./plate-item";

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
              <PlateItem 
                key={plate.id} 
                plate={plate} 
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
