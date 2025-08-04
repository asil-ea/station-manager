import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
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
      <header className="border-b border-b-foreground/10">
        <div className="max-w-4xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-6 w-6" />
              Yeni Kullanıcı Ekle
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
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Yeni Kullanıcı Oluştur</CardTitle>
              <CardDescription>
                Sisteme yeni bir kullanıcı ekleyin ve rolünü belirleyin
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
