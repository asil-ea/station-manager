import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/common/responsive-header";
import { Receipt } from "lucide-react";
import { TransactionsTable } from "@/components/admin/iskonto-gecmisi/transactions-table";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // Check if user is admin and get user details
  const { data: userDetails } = await supabase
    .from('user_details')
    .select('role, name')
    .eq('uid', user.id)
    .single();

  if (userDetails?.role !== 'admin') {
    redirect("/staff");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ResponsiveHeader
        title="İşlem Geçmişi"
        backHref="/admin"
        backText="Admin Panel"
        userEmail={user.email}
        userName={userDetails?.name}
        maxWidth="max-w-7xl"
      >
        <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
      </ResponsiveHeader>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-2">Tüm İşlemler</h2>
          <p className="text-muted-foreground">
            Sistemde gerçekleşen tüm alışveriş işlemlerini görüntüleyin ve filtreleyin.
          </p>
        </div>
        
        <TransactionsTable />
      </main>
    </div>
  );
}
