import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/common/responsive-header";
import { PlateManagement } from "@/components/admin/iskonto-yonetim/plate-management";

export default async function PlateManagementPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: userDetails } = await supabase
    .from('user_details')
    .select('role, name')
    .eq('uid', user.sub)
    .single();

  if (userDetails?.role !== 'admin') {
    redirect("/staff");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ResponsiveHeader
        title="Plaka & İskonto Yönetimi"
        backHref="/admin"
        backText="Admin Panel"
        userEmail={user.email}
        userName={userDetails?.name}
        maxWidth="max-w-7xl"
      />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        <PlateManagement />
      </main>
    </div>
  );
}
