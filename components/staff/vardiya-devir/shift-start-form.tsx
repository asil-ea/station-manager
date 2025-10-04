"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ShiftEndChecklist, { ChecklistAnswer } from "./shift-end-checklist";

type UserRow = {
	id: string; // auth.users.id
	email: string | null;
	user_details?: { name: string | null } | null;
};

export default function ShiftStartForm() {
	const supabase = useMemo(() => createClient(), []);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [outgoingUserId, setOutgoingUserId] = useState<string>("");
	const [users, setUsers] = useState<UserRow[]>([]);
	const [answers, setAnswers] = useState<ChecklistAnswer[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		async function init() {
			setLoading(true);
			setError(null);
			const {
				data: { user },
				error: userErr,
			} = await supabase.auth.getUser();
			if (!mounted) return;
			if (userErr) {
				setError(userErr.message);
				setLoading(false);
				return;
			}
			setCurrentUserId(user?.id ?? null);

			// Fetch staff list from auth.users joined with user_details
			const { data, error } = await supabase
				.from("user_details")
				.select("uid, name")
				.order("name", { ascending: true });

			if (!mounted) return;
			if (error) {
				setError(error.message);
			} else {
				const rows: UserRow[] = (data || []).map((r: any) => ({
					id: r.uid,
					email: null,
					user_details: { name: r.name },
				}));
				setUsers(rows);
			}
			setLoading(false);
		}
		init();
		return () => {
			mounted = false;
		};
	}, [supabase]);

	const handleSubmit = useCallback(async () => {
		setSubmitting(true);
		setError(null);
		setSuccess(null);
		try {
			if (!currentUserId) throw new Error("Kullanıcı bulunamadı");
			if (!outgoingUserId) throw new Error("Çıkan personeli seçiniz");

			const { data: handover, error } = await supabase
				.from("shift_handover")
				.insert({
					incoming_user: currentUserId,
					outgoing_user: outgoingUserId,
					status: "pending",
				})
				.select("id")
				.single();
			if (error) throw error;
			const handoverId = handover.id as number;

			if (answers.length > 0) {
				const payload = answers.map((a) => ({
					handover_id: handoverId,
					item_id: a.item_id,
					passed: a.passed,
					note: a.note ?? null,
				}));
				const { error: itemErr } = await supabase
					.from("shift_handover_item")
					.insert(payload);
				if (itemErr) throw itemErr;
			}

			setSuccess("Vardiya devri isteği oluşturuldu. Çıkan personel onaylamalı.");
			setOutgoingUserId("");
			setAnswers([]);
		} catch (e: any) {
			setError(e.message || "Bir hata oluştu");
		} finally {
			setSubmitting(false);
		}
	}, [answers, currentUserId, outgoingUserId, supabase]);

	if (loading) return <div>Yükleniyor…</div>;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Vardiya Başlangıcı</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && <div className="text-red-600">{error}</div>}
				{success && <div className="text-green-600">{success}</div>}
				<div className="space-y-2">
					<Label htmlFor="outgoing">Çıkan Personel</Label>
					<select
						id="outgoing"
						className="border rounded-md p-2 w-full bg-background"
						value={outgoingUserId}
						onChange={(e) => setOutgoingUserId(e.target.value)}
					>
						<option value="">Seçiniz</option>
						{users
							.filter((u) => u.id !== currentUserId)
							.map((u) => (
								<option key={u.id} value={u.id}>
									{u.user_details?.name || u.email || u.id}
								</option>
							))}
					</select>
				</div>

				<ShiftEndChecklist onChange={setAnswers} />

				<div className="flex justify-end">
					<Button onClick={handleSubmit} disabled={submitting || !outgoingUserId}>
						{submitting ? "Gönderiliyor…" : "Onaya Gönder"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

