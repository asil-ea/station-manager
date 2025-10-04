import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/common/responsive-header";
import { CleaningEntryForm } from "@/components/staff/temizlik-giris/cleaning-entry-form";

export default async function CleaningEntryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch user details and available cleaning operations in parallel
  const [userDetailsResult, operationsResult] = await Promise.all([
    supabase.from("user_details").select("name").eq("uid", user.id).single(),
    supabase.from("temizlik_islem").select("*").order("islem"),
  ]);

  const { data: userDetails, error: userDetailsError } = userDetailsResult;
  const { data: operations, error: operationsError } = operationsResult;

  if (userDetailsError) {
    console.error("Error fetching user details:", userDetailsError);
  }
  if (operationsError) {
    console.error("Error fetching cleaning operations:", operationsError);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ResponsiveHeader
        title="Temizlik Girişi"
        backHref="/staff"
        backText="Geri Dön"
        userEmail={user.email}
        userName={userDetails?.name}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6">
        <div className="grid gap-4 sm:gap-6">
          <div className="bg-card border rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">
              Temizlik Faaliyeti Girişi
            </h2>
            <p className="text-muted-foreground mb-6">
              Günlük temizlik faaliyetlerinizi kaydedin.
            </p>

            <CleaningEntryForm
              operations={operations || []}
              userId={user.id}
              userName={userDetails?.name}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
