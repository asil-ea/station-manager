'use client';

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Calendar, User, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Transaction {
  id: number;
  created_at: string;
  alis_tip: string;
  alis_litre: number;
  alis_tutar: number;
  iskonto_oran: number;
  net_tutar: number;
  litre_fiyat: number;
  aciklama: string | null;
  personel: string;
  iskonto_listesi: {
    plaka: string;
  };
  user_details: {
    name: string;
  } | null;
}

interface FilterState {
  plaka: string;
  alis_tip: string;
  date_from: string;
  date_to: string;
  personel: string;
}

export function TransactionsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    plaka: '',
    alis_tip: '',
    date_from: '',
    date_to: '',
    personel: ''
  });

  const supabase = createClient();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // First, fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('iskonto_alisveris')
        .select(`
          *,
          iskonto_listesi!musteri (
            plaka
          )
        `)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        throw new Error("İşlemler yüklenirken hata oluştu: " + transactionsError.message);
      }

      // Get unique personnel UUIDs
      const personnelUuids = [...new Set(transactionsData?.map(t => t.personel) || [])];
      
      // Fetch user details for all personnel
      const { data: userDetailsData, error: userDetailsError } = await supabase
        .from('user_details')
        .select('uid, name')
        .in('uid', personnelUuids);

      if (userDetailsError) {
        throw new Error("Personel bilgileri yüklenirken hata oluştu: " + userDetailsError.message);
      }

      // Create a map for quick lookup
      const userDetailsMap = new Map(userDetailsData?.map(ud => [ud.uid, ud]) || []);

      // Merge the data
      const enrichedTransactions = transactionsData?.map(transaction => ({
        ...transaction,
        user_details: userDetailsMap.get(transaction.personel) || null
      })) || [];

      setTransactions(enrichedTransactions);
      setFilteredTransactions(enrichedTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by plate
    if (filters.plaka.trim()) {
      filtered = filtered.filter(t => 
        t.iskonto_listesi?.plaka?.toLowerCase().includes(filters.plaka.toLowerCase())
      );
    }

    // Filter by transaction type
    if (filters.alis_tip.trim()) {
      filtered = filtered.filter(t => 
        t.alis_tip.toLowerCase().includes(filters.alis_tip.toLowerCase())
      );
    }

    // Filter by personnel (name for now)
    if (filters.personel.trim()) {
      filtered = filtered.filter(t => 
        t.user_details?.name?.toLowerCase().includes(filters.personel.toLowerCase())
      );
    }

    // Filter by date range
    if (filters.date_from) {
      filtered = filtered.filter(t => 
        new Date(t.created_at) >= new Date(filters.date_from)
      );
    }

    if (filters.date_to) {
      filtered = filtered.filter(t => 
        new Date(t.created_at) <= new Date(filters.date_to + 'T23:59:59')
      );
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setFilters({
      plaka: '',
      alis_tip: '',
      date_from: '',
      date_to: '',
      personel: ''
    });
    setFilteredTransactions(transactions);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p>İşlemler yükleniyor...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtreler
              </CardTitle>
              <CardDescription>
                İşlemleri filtrelemek için aşağıdaki alanları kullanın
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Gizle' : 'Göster'}
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="filter-plaka">Plaka</Label>
                <Input
                  id="filter-plaka"
                  placeholder="Plaka ara..."
                  value={filters.plaka}
                  onChange={(e) => setFilters(prev => ({ ...prev, plaka: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-alis-tip">Alış Tipi</Label>
                <Input
                  id="filter-alis-tip"
                  placeholder="Alış tipi ara..."
                  value={filters.alis_tip}
                  onChange={(e) => setFilters(prev => ({ ...prev, alis_tip: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-personel">Personel</Label>
                <Input
                  id="filter-personel"
                  placeholder="Personel ara..."
                  value={filters.personel}
                  onChange={(e) => setFilters(prev => ({ ...prev, personel: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-date-from">Başlangıç Tarihi</Label>
                <Input
                  id="filter-date-from"
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="filter-date-to">Bitiş Tarihi</Label>
                <Input
                  id="filter-date-to"
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
              
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Filtreleri Temizle
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredTransactions.length} işlem bulundu (toplam {transactions.length} işlem)
        </p>
        <Button variant="outline" onClick={fetchTransactions}>
          Yenile
        </Button>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>İşlem Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {transactions.length === 0 ? "Henüz işlem bulunmuyor" : "Filtreye uygun işlem bulunamadı"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tarih</th>
                    <th className="text-left p-2">Plaka</th>
                    <th className="text-left p-2">Alış Tipi</th>
                    <th className="text-right p-2">Litre</th>
                    <th className="text-right p-2">Litre Fiyatı</th>
                    <th className="text-right p-2">Toplam Tutar</th>
                    <th className="text-right p-2">İskonto %</th>
                    <th className="text-right p-2">Net Tutar</th>
                    <th className="text-left p-2">Personel</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-secondary/10">
                      <td className="p-2 text-sm">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="font-mono">
                          {transaction.iskonto_listesi?.plaka || 'N/A'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary">
                          {transaction.alis_tip}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {transaction.alis_litre.toFixed(2)} L
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCurrency(transaction.litre_fiyat)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {formatCurrency(transaction.alis_tutar)}
                      </td>
                      <td className="p-2 text-right">
                        <Badge variant="destructive">
                          %{transaction.iskonto_oran}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        {formatCurrency(transaction.net_tutar)}
                      </td>
                      <td className="p-2 text-sm">
                        {transaction.user_details?.name || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
