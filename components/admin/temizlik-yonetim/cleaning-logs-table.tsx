'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Eye, 
  Camera, 
  Search, 
  Calendar,
  User,
  FileText,
  ExternalLink
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CleaningLog {
  id: number;
  timestamp: string;
  aciklama: string | null;
  created_at: string;
  personel?: string;
  user_details: {
    name: string;
  };
  temizlik_gunluk_islem: Array<{
    temizlik_islem: {
      islem: string;
    };
  }>;
  temizlik_gunluk_foto: Array<{
    id: number;
    foto: string;
  }>;
}

interface CleaningLogsTableProps {
  logs: CleaningLog[];
}

export function CleaningLogsTable({ logs }: CleaningLogsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<CleaningLog | null>(null);
  const [isViewingPhotos, setIsViewingPhotos] = useState(false);

  const supabase = createClient();

  // Filter logs based on search term and date
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_details.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.temizlik_gunluk_islem.some(item => 
                           item.temizlik_islem.islem.toLowerCase().includes(searchTerm.toLowerCase())
                         ) ||
                         (log.aciklama && log.aciklama.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDate = !dateFilter || 
                       new Date(log.timestamp).toISOString().split('T')[0] === dateFilter;

    return matchesSearch && matchesDate;
  });

  const getPhotoUrl = (photoPath: string) => {
    const { data } = supabase.storage
      .from('temizlik-foto')
      .getPublicUrl(photoPath);
    return data.publicUrl;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (selectedLog && isViewingPhotos) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setIsViewingPhotos(false)}
          >
            ← Geri Dön
          </Button>
          <h3 className="text-lg font-semibold">
            {selectedLog.user_details.name} - Fotoğraflar
          </h3>
        </div>

        {selectedLog.temizlik_gunluk_foto.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Bu temizlik kaydı için fotoğraf bulunmuyor.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedLog.temizlik_gunluk_foto.map((photo) => (
              <Card key={photo.id}>
                <CardContent className="p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPhotoUrl(photo.foto)}
                    alt={`Temizlik fotoğrafı ${photo.id}`}
                    className="w-full h-48 object-cover rounded-md mb-2"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(getPhotoUrl(photo.foto), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Tam Boyut
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (selectedLog) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setSelectedLog(null)}
          >
            ← Geri Dön
          </Button>
          <div className="flex gap-2">
            {selectedLog.temizlik_gunluk_foto.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => setIsViewingPhotos(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Fotoğrafları Görüntüle ({selectedLog.temizlik_gunluk_foto.length})
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Personel</Label>
                  <p className="text-lg font-semibold">{selectedLog.user_details.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tarih & Saat</Label>
                  <p className="text-lg">{formatDate(selectedLog.timestamp)}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Gerçekleştirilen İşlemler</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedLog.temizlik_gunluk_islem.map((item, index) => (
                    <Badge key={index} variant="secondary">
                      {item.temizlik_islem.islem}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedLog.aciklama && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Açıklama</Label>
                  <p className="mt-2 p-3 bg-secondary/20 rounded-md">
                    {selectedLog.aciklama}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Kayıt Tarihi</Label>
                  <p>{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fotoğraf Sayısı</Label>
                  <p>{selectedLog.temizlik_gunluk_foto.length} adet</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Arama</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Personel adı, işlem veya açıklama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date">Tarih Filtresi</Label>
              <Input
                id="date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredLogs.length} kayıt gösteriliyor
        </p>
        {(searchTerm || dateFilter) && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setDateFilter("");
            }}
          >
            Filtreleri Temizle
          </Button>
        )}
      </div>

      {/* Logs Table */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Gösterilecek temizlik kaydı bulunamadı.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{log.user_details.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(log.timestamp)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {log.temizlik_gunluk_islem.slice(0, 3).map((item, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {item.temizlik_islem.islem}
                        </Badge>
                      ))}
                      {log.temizlik_gunluk_islem.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{log.temizlik_gunluk_islem.length - 3} daha
                        </Badge>
                      )}
                    </div>

                    {log.aciklama && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {log.aciklama}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {log.temizlik_gunluk_foto.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          <span>{log.temizlik_gunluk_foto.length} fotoğraf</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Detay
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
