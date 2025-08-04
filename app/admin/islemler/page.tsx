import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt } from "lucide-react";
import { TransactionsTable } from "@/components/transactions-table";

export default async function TransactionsPage() {
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-b-foreground/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              İşlem Geçmişi
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
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Tüm İşlemler</h2>
          <p className="text-muted-foreground">
            Sistemde gerçekleşen tüm alışveriş işlemlerini görüntüleyin ve filtreleyin.
          </p>
        </div>
        
        <TransactionsTable />
      </main>
    </div>
  );
}
