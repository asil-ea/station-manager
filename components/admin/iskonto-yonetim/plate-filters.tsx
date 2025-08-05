'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

/* eslint-disable no-unused-vars */
interface PlateFiltersProps {
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
}
/* eslint-enable no-unused-vars */

export function PlateFilters({ 
  searchTerm, 
  statusFilter, 
  onSearchChange, 
  onStatusFilterChange
}: PlateFiltersProps) {
  return (
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="md:w-48">
        <Label htmlFor="status-filter">Durum Filtresi</Label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
          className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Tümü</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
        </select>
      </div>
    </div>
  );
}
