import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { PlateDiscountSearch } from "@/components/plate-discount-search";

export default async function IskontoListesi() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-b-foreground/10">
        <div className="max-w-5xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ana Panel'e Dön
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">İskonto Listesi</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {user.email}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        <div className="grid gap-6">
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
