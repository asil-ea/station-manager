import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/common/responsive-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlateDiscountSearch } from "@/components/iskonto-listesi/plate-discount-search";

export default async function IskontoListesi() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ResponsiveHeader
        title="İskonto Listesi"
        backHref="/dashboard"
        backText="Ana Panel'e Dön"
        userEmail={user.email}
      />
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6">
        <div className="grid gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Plaka İskonto Sorgulama</CardTitle>
              <CardDescription>
                Araç plakası girerek iskonto oranını öğrenebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlateDiscountSearch />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
