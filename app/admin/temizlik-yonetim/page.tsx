import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/common/responsive-header";
import { CleaningLogsTable } from "@/components/admin/temizlik-yonetim/cleaning-logs-table";

export default async function CleaningManagementPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: userDetails } = await supabase
    .from("user_details")
    .select("role, name")
    .eq("uid", user.sub)
    .single();

  if (userDetails?.role !== "admin") {
    redirect("/staff");
  }

  // Fetch cleaning logs with user details and operations
  const { data: cleaningLogs, error: logsError } = await supabase
    .from("temizlik_gunluk")
    .select(`
      id,
      timestamp,
      aciklama,
      created_at,
      personel,
      temizlik_gunluk_islem (
        temizlik_islem (
          islem
        )
      ),
      temizlik_gunluk_foto (
        id,
        foto
      )
    `)
    .order("timestamp", { ascending: false });

  // Get user details for each cleaning log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let enrichedLogs: any[] = [];
  if (cleaningLogs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userIds = [...new Set(cleaningLogs.map((log: any) => log.personel))];
    const { data: userDetails } = await supabase
      .from("user_details")
      .select("uid, name")
      .in("uid", userIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrichedLogs = cleaningLogs.map((log: any) => ({
      ...log,
      user_details: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: userDetails?.find((user: any) => user.uid === log.personel)?.name || "Bilinmeyen"
      }
    }));
  }

  if (logsError) {
    console.error("Error fetching cleaning logs:", logsError);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ResponsiveHeader 
        title="Temizlik Yönetimi"
        backHref="/admin"
        backText="Admin Paneli"
        userEmail={user.email} 
        userName={userDetails?.name}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">
              Temizlik Kayıtları
            </h2>
            <p className="text-muted-foreground mb-6">
              Personel tarafından gerçekleştirilen temizlik faaliyetlerini görüntüleyin ve yönetin.
            </p>

            <CleaningLogsTable logs={enrichedLogs || []} />
          </div>
        </div>
      </main>
    </div>
  );
}
