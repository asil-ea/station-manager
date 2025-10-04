"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RequestPlateDialogProps {
  open: boolean;
  plateNumber: string;
  user: Record<string, unknown> | null;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onSuccess: Dispatch<SetStateAction<string | null>>;
  onError: Dispatch<SetStateAction<string | null>>;
}

interface RequestFormState {
  plaka: string;
  aciklama: string;
}

export function RequestPlateDialog({
  open,
  plateNumber,
  user,
  onOpenChange,
  onSuccess,
  onError,
}: RequestPlateDialogProps) {
  const supabase = useMemo(() => createClient(), []);
  const [formState, setFormState] = useState<RequestFormState>({
    plaka: "",
    aciklama: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState<string | null>(null);

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      plaka: formatPlate(plateNumber),
    }));
  }, [plateNumber]);

  useEffect(() => {
    let isMounted = true;

    async function fetchRequesterName() {
      if (!user || typeof user !== "object" || !("sub" in user) || !user.sub) {
        return;
      }

      try {
        const { data } = await supabase
          .from("user_details")
          .select("name")
          .eq("uid", user.sub as string)
          .single();

        if (isMounted) {
          setRequesterName(data?.name ?? null);
        }
      } catch (error) {
        console.error("Failed to fetch requester name", error);
      }
    }

    fetchRequesterName();

    return () => {
      isMounted = false;
    };
  }, [supabase, user]);

  const formatPlate = (value: string) => value.replace(/\s/g, "").toUpperCase();

  const resetForm = () => {
    setFormState({
      plaka: formatPlate(plateNumber),
      aciklama: "",
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const normalizedPlate = formatPlate(formState.plaka);

    if (!normalizedPlate) {
      setFormError("Plaka numarası zorunludur.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Ensure plate not already active
      const { data: existingPlate } = await supabase
        .from("iskonto_listesi")
        .select("id")
        .eq("plaka", normalizedPlate)
        .maybeSingle();

      if (existingPlate) {
        setFormError("Bu plaka zaten iskonto listesinde bulunuyor.");
        setIsSubmitting(false);
        return;
      }

      // Ensure there isn't already a pending request
      const { data: existingRequest } = await supabase
        .from("iskonto_plaka_talepleri")
        .select("id, durum")
        .eq("plaka", normalizedPlate)
        .eq("durum", "pending")
        .maybeSingle();

      if (existingRequest) {
        setFormError("Bu plaka için zaten bekleyen bir talep bulunuyor.");
        setIsSubmitting(false);
        return;
      }

      const insertPayload = {
        plaka: normalizedPlate,
        aciklama: formState.aciklama.trim() || null,
        requested_by: (user && typeof user === "object" && "sub" in user ? (user.sub as string) : null),
        requested_by_email: (user && typeof user === "object" && "email" in user ? (user.email as string) : null),
        requested_by_name: requesterName,
      };

      if (!insertPayload.requested_by) {
        setFormError("Talep kaydetmek için kullanıcı oturumu bulunamadı.");
        setIsSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("iskonto_plaka_talepleri")
        .insert(insertPayload);

      if (insertError) {
        console.error(insertError);
        throw new Error(insertError.message);
      }

      const successMessage = `${normalizedPlate} plakası için talebiniz başarıyla gönderildi.`;
      setFormSuccess(successMessage);
      onError(null);
      onSuccess(successMessage);
      setTimeout(() => {
        handleClose(false);
      }, 800);
    } catch (err) {
      console.error("Plate request error", err);
      const message = err instanceof Error ? err.message : "Talep gönderilirken bir hata oluştu.";
      setFormError(message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Yeni Plaka İskonto Talebi</DialogTitle>
          <DialogDescription>
            Plaka için iskonto talebinizi yöneticilere iletin. Talebiniz onaylandığında iskonto otomatik olarak eklenir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="request-plaka">Plaka Numarası</Label>
            <Input
              id="request-plaka"
              value={formState.plaka}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  plaka: formatPlate(event.target.value),
                }))
              }
              maxLength={10}
              className="font-mono tracking-wide"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-aciklama">Talep Notu (İsteğe Bağlı)</Label>
            <textarea
              id="request-aciklama"
              value={formState.aciklama}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  aciklama: event.target.value,
                }))
              }
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Örn: Kurumsal müşteri, yeni filo aracı vb."
            />
            <p className="text-xs text-muted-foreground">
              Yöneticiler talebinizi değerlendirirken bu notu görecektir.
            </p>
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="mt-0.5 h-4 w-4" />
              <span>{formSuccess}</span>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Gönderiliyor..." : "Talep Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
