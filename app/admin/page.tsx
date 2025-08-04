import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, BarChart3, Shield, Car, Receipt, UserPlus } from "lucide-react";
import { ResponsiveHeader } from "@/components/common/responsive-header";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // Check if user is admin and get user details
  const { data: userDetails } = await supabase
    .from("user_details")
    .select("role, name")
    .eq("uid", user.id)
    .single();

  if (userDetails?.role !== "admin") {
    redirect("/staff");
  }

  // Get user count
  const { count: userCount } = await supabase
    .from("user_details")
    .select("*", { count: "exact", head: true });

  // Get admin count
  const { count: adminCount } = await supabase
    .from("user_details")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  return (
    <>
      <ResponsiveHeader
        title="Admin Panel"
        backHref="/staff"
        backText="Personel Paneli"
        userEmail={user.email}
        userName={userDetails?.name}
        maxWidth="max-w-6xl"
      >
        <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
      </ResponsiveHeader>
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6">
        <div className="grid gap-4 sm:gap-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Toplam Kullanıcı
                </CardTitle>
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
                <CardTitle className="text-sm font-medium">
                  Admin Sayısı
                </CardTitle>
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
                <CardTitle className="text-sm font-medium">
                  Sistem Durumu
                </CardTitle>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/admin/iskonto-yonetim">
                  <Button
                    variant="outline"
                    className="h-16 sm:h-20 flex flex-col gap-2 w-full"
                  >
                    <Car className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-sm sm:text-base">Plaka & İskonto Yönetimi</span>
                  </Button>
                </Link>

                <Link href="/admin/iskonto-gecmisi">
                  <Button
                    variant="outline"
                    className="h-16 sm:h-20 flex flex-col gap-2 w-full"
                  >
                    <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-sm sm:text-base">İskontolu İşlem Geçmişi</span>
                  </Button>
                </Link>

                <Link href="/admin/kullanici-ekle">
                  <Button
                    variant="outline"
                    className="h-16 sm:h-20 flex flex-col gap-2 w-full"
                  >
                    <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-sm sm:text-base">Kullanıcı Ekle</span>
                  </Button>
                </Link>
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
    </>
  );
}
