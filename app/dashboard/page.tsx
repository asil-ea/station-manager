import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/responsive-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // Check user role
  const { data: userRole } = await supabase
    .from('user_details')
    .select('role')
    .eq('uid', user.id)
    .single();

  const isAdmin = userRole?.role === 'admin';

  // const headerActions = (
  //   <div className="flex items-center gap-4">
  //     <span className="text-sm text-muted-foreground hidden sm:block">
  //       Hoş geldiniz, {user.email}
  //       {isAdmin && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Admin</span>}
  //     </span>
  //     <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded sm:hidden">
  //       {isAdmin ? 'Admin' : 'Kullanıcı'}
  //     </span>
  //   </div>
  // );

  return (
    <div className="min-h-screen flex flex-col">
      <ResponsiveHeader
        title="Ana Panel"
        userEmail={user.email}
      >
        {isAdmin && (
          <Link href="/admin">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden xs:inline">Admin Panel</span>
            </Button>
          </Link>
        )}
      </ResponsiveHeader>
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6">
        <div className="grid gap-4 sm:gap-6">
          <div className="bg-card border rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Ana Panel</h2>
            <p className="text-muted-foreground mb-6">
              İstasyon yönetim sistemine hoş geldiniz.
            </p>
            
            {/* Hızlı Erişim Linkleri */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/iskonto-listesi" className="block">
                <div className="bg-secondary/10 p-4 rounded-md border border-primary/20 hover:bg-secondary/20 transition-colors">
                  <h3 className="font-semibold mb-2">İskonto Listesi</h3>
                  <p className="text-sm text-muted-foreground">
                    İndirim oranları ve promosyon tekliflerini görüntüleyin.
                  </p>
                </div>
              </Link>
              
              {isAdmin && (
                <Link href="/admin" className="block">
                  <div className="bg-/10 p-4 rounded-md border border-primary/20 hover:bg-primary/20 transition-colors">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Sistem yönetimi, kullanıcı yönetimi ve raporlar.
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}