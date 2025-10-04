"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = {
  id: number;
  created_at: string;
  incoming_user: string;
  outgoing_user: string;
  status: string;
};

export default function PendingApprovals() {
  const supabase = useMemo(() => createClient(), []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [noteById, setNoteById] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) {
        if (mounted) setError(userErr.message);
        return;
      }
      if (!mounted) return;
      setCurrentUserId(user?.id ?? null);
      if (!user?.id) return;
      setLoading(true);

      const { data: handovers, error } = await supabase
        .from("shift_handover")
        .select("id, created_at, incoming_user, outgoing_user, status")
        .eq("outgoing_user", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) setError(error.message);
      else setRows((handovers as any) || []);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const [nameByUid, setNameByUid] = useState<Record<string, string>>({});
  useEffect(() => {
    let mounted = true;
    async function hydrateNames() {
      const uids = Array.from(new Set(rows.map((r) => r.incoming_user)));
      if (uids.length === 0) return;
      const { data, error } = await supabase
        .from("user_details")
        .select("uid, name")
        .in("uid", uids);
      if (!mounted) return;
      if (error) return; // non-fatal
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        map[r.uid] = r.name || r.uid;
      });
      setNameByUid(map);
    }
    hydrateNames();
    return () => {
      mounted = false;
    };
  }, [rows, supabase]);

  async function act(id: number, approve: boolean) {
    const note = noteById[id] || null;
    const { error } = await supabase
      .from("shift_handover")
      .update({ status: approve ? "approved" : "rejected", approver_note: note, approved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending");
    if (error) {
      alert(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <div>Bekleyen onaylar yükleniyor…</div>;
  if (error) return <div className="text-red-600">Hata: {error}</div>;
  if (!currentUserId) return <div>Giriş gerekli.</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bekleyen Onaylar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 && <div>Bekleyen onay bulunmuyor.</div>}
        {rows.map((r) => (
          <div key={r.id} className="border rounded-md p-3 space-y-2">
            <div className="text-sm">
              Gelen personel: <b>{nameByUid[r.incoming_user] || r.incoming_user}</b> – Talep tarihi: {new Date(r.created_at).toLocaleString()}
            </div>
            <Input
              placeholder="Onay/Red notu (opsiyonel)"
              value={noteById[r.id] || ""}
              onChange={(e) => setNoteById((p) => ({ ...p, [r.id]: e.target.value }))}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => act(r.id, false)}>Reddet</Button>
              <Button onClick={() => act(r.id, true)}>Onayla</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
