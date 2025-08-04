import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/responsive-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { CreateUserForm } from "@/components/create-user-form";

export default async function CreateUserPage() {
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
        title="Kullanıcı Ekle"
        backHref="/admin"
        backText="Admin Panel"
        userEmail={user.email}
        maxWidth="max-w-4xl"
      >
        <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
      </ResponsiveHeader>
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Yeni Kullanıcı Oluştur</CardTitle>
              <CardDescription>
                Sisteme yeni bir kullanıcı ekleyin ve rolünü belirleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateUserForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
