"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface UserData {
  email: string;
  password: string;
  name: string;
  role: string;
  tel: string;
}

export function CreateUserForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<UserData>({
    email: "",
    password: "",
    name: "",
    role: "user",
    tel: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const length = 12;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData((prev) => ({ ...prev, password }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!formData.email.trim()) {
        throw new Error("E-posta adresi zorunludur");
      }

      if (!formData.password.trim() || formData.password.length < 8) {
        throw new Error("Şifre en az 8 karakter olmalıdır");
      }

      if (!formData.name.trim()) {
        throw new Error("Ad Soyad zorunludur");
      }

      const supabase = createClient();

      // Create the user account using sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // Don't send confirmation email
        },
      });

      if (authError) {
        throw new Error("Kullanıcı oluşturulurken hata: " + authError.message);
      }

      if (!authData.user) {
        throw new Error("Kullanıcı oluşturulamadı");
      }

      // Add user details (including role)
      const { error: detailsError } = await supabase
        .from("user_details")
        .insert({
          uid: authData.user.id,
          name: formData.name.trim(),
          role: formData.role,
          tel: formData.tel.trim() || null,
        });

      if (detailsError) {
        throw new Error(
          "Kullanıcı detayları eklenirken hata: " + detailsError.message
        );
      }

      setSuccess(true);

      // Reset form after 3 seconds and redirect
      setTimeout(() => {
        setFormData({
          email: "",
          password: "",
          name: "",
          role: "user",
          tel: "",
        });
        setSuccess(false);
        router.push("/admin");
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-green-600 mb-2">
            Başarılı!
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            Kullanıcı başarıyla oluşturuldu. Admin paneline
            yönlendiriliyorsunuz...
          </p>
          <div className="bg-secondary/20 p-4 rounded-md w-full">
            <h4 className="font-semibold mb-2">Kullanıcı Bilgileri:</h4>
            <p>
              <strong>E-posta:</strong> {formData.email}
            </p>
            <p>
              <strong>Şifre:</strong> {formData.password}
            </p>
            <p>
              <strong>Rol:</strong> {formData.role}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-posta Adresi</Label>
        <Input
          id="email"
          type="email"
          placeholder="kullanici@example.com"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="En az 8 karakter"
            value={formData.password}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            className="pr-20"
            required
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
              className="h-6 w-6 p-0"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generatePassword}
          >
            Şifre Oluştur
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Ad Soyad</Label>
        <Input
          id="name"
          type="text"
          placeholder="Kullanıcının tam adı"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Kullanıcı Rolü</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant={formData.role === "user" ? "default" : "outline"}
            size="sm"
            onClick={() => setFormData((prev) => ({ ...prev, role: "user" }))}
          >
            Kullanıcı
          </Button>
          <Button
            type="button"
            variant={formData.role === "admin" ? "default" : "outline"}
            size="sm"
            onClick={() => setFormData((prev) => ({ ...prev, role: "admin" }))}
          >
            Admin
          </Button>
        </div>
        <Badge
          variant={formData.role === "admin" ? "destructive" : "secondary"}
        >
          Seçili: {formData.role === "admin" ? "Admin" : "Kullanıcı"}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tel">Telefon (İsteğe bağlı)</Label>
        <Input
          id="tel"
          type="tel"
          placeholder="5XX XXX XX XX"
          value={formData.tel}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, tel: e.target.value }))
          }
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            "Oluşturuluyor..."
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Kullanıcı Oluştur
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin")}
          disabled={isSubmitting}
        >
          İptal
        </Button>
      </div>
    </form>
  );
}
