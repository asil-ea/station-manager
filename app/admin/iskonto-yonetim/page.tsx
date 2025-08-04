import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/responsive-header";
import { PlateManagement } from "@/components/plate-management";

export default async function PlateManagementPage() {
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
      <ResponsiveHeader
        title="Plaka & İskonto Yönetimi"
        backHref="/admin"
        backText="Admin Panel"
        userEmail={user.email}
        maxWidth="max-w-7xl"
      />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        <PlateManagement />
      </main>
    </div>
  );
}
