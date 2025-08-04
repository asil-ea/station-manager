import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Settings, BarChart3, Shield, ArrowLeft, Plus, Receipt, UserPlus } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: userRole } = await supabase
    .from('user_details')
    .select('role')
    .eq('uid', user.id)
    .single();

  if (userRole?.role !== 'admin') {
    redirect("/dashboard");
  }

  // Get user count
  const { count: userCount } = await supabase
    .from('auth.users')
    .select('*', { count: 'exact', head: true });

  // Get admin count
  const { count: adminCount } = await supabase
    .from('user_details')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-b-foreground/10">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Ana Panel
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Panel
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.email}
              <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Admin</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-6xl mx-auto w-full p-6">
        <div className="grid gap-6">
          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Sistemde kayıtlı kullanıcı sayısı
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Sayısı</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Admin yetkisine sahip kullanıcı
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sistem Durumu</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Aktif</div>
                <p className="text-xs text-muted-foreground">
                  Tüm servisler çalışıyor
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Yönetim İşlemleri</CardTitle>
              <CardDescription>
                Sistem yönetimi ve kullanıcı işlemleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/admin/plaka-ekle">
                  <Button variant="outline" className="h-20 flex flex-col gap-2 w-full">
                    <Plus className="h-6 w-6" />
                    <span>Plaka Ekle</span>
                  </Button>
                </Link>
                
                <Link href="/admin/islemler">
                  <Button variant="outline" className="h-20 flex flex-col gap-2 w-full">
                    <Receipt className="h-6 w-6" />
                    <span>İşlem Geçmişi</span>
                  </Button>
                </Link>
                
                <Link href="/admin/kullanici-ekle">
                  <Button variant="outline" className="h-20 flex flex-col gap-2 w-full">
                    <UserPlus className="h-6 w-6" />
                    <span>Kullanıcı Ekle</span>
                  </Button>
                </Link>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Users className="h-6 w-6" />
                  <span>Kullanıcı Listesi</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Settings className="h-6 w-6" />
                  <span>Sistem Ayarları</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>Raporlar</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {/* <Card>
            <CardHeader>
              <CardTitle>Son Aktiviteler</CardTitle>
              <CardDescription>
                Sistemde gerçekleşen son işlemler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-md">
                  <div>
                    <p className="font-medium">Yeni kullanıcı kaydı</p>
                    <p className="text-sm text-muted-foreground">2 saat önce</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Başarılı</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-md">
                  <div>
                    <p className="font-medium">Sistem güncellendi</p>
                    <p className="text-sm text-muted-foreground">1 gün önce</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Bilgi</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-md">
                  <div>
                    <p className="font-medium">Veritabanı yedeği alındı</p>
                    <p className="text-sm text-muted-foreground">3 gün önce</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Başarılı</span>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </main>
    </div>
  );
}