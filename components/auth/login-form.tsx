"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  message,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { message?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const getMessageText = (msgCode?: string) => {
    switch (msgCode) {
      case 'signup_disabled':
        return 'Yeni kullanıcı kaydı şu anda kapalıdır. Lütfen yöneticinizle iletişime geçin.';
      case 'forgot_password_disabled':
        return 'Şifre sıfırlama özelliği şu anda kapalıdır. Lütfen yöneticinizle iletişime geçin.';
      case 'update_password_disabled':
        return 'Şifre güncelleme özelliği şu anda kapalıdır. Lütfen yöneticinizle iletişime geçin.';
      default:
        return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Redirect to dashboard after successful login
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Giriş yap</CardTitle>
          <CardDescription>
            Hesabınıza giriş yapmak için e-posta adresinizi girin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && getMessageText(message) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">{getMessageText(message)}</p>
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Giriş yapılıyor..." : "Giriş yap"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
