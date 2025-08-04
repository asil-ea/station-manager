import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/common/responsive-header";
import { ReactNode } from "react";

interface AuthenticatedLayoutProps {
  children: ReactNode;
  title: string;
  backHref?: string;
  backText?: string;
  maxWidth?: string;
  headerChildren?: ReactNode;
  headerActions?: ReactNode;
  requireAdmin?: boolean;
}

export async function AuthenticatedLayout({
  children,
  title,
  backHref,
  backText,
  maxWidth = "max-w-5xl",
  headerChildren,
  headerActions,
  requireAdmin = false
}: AuthenticatedLayoutProps) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // Check user role if admin is required
  if (requireAdmin) {
    const { data: userRole } = await supabase
      .from('user_details')
      .select('role')
      .eq('uid', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ResponsiveHeader
        title={title}
        backHref={backHref}
        backText={backText}
        userEmail={user.email}
        maxWidth={maxWidth}
      >
        {headerChildren}
      </ResponsiveHeader>
      
      <main className={`flex-1 ${maxWidth} mx-auto w-full p-4 sm:p-6`}>
        {children}
      </main>
    </div>
  );
}
