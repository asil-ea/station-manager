"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type ChecklistItem = {
	id: number;
	title: string;
	description: string | null;
	sort_order: number;
};

export type ChecklistAnswer = {
	item_id: number;
	passed: boolean;
	note?: string;
};

export function ShiftEndChecklist({
	onChange,
}: {
	onChange: (answers: ChecklistAnswer[]) => void;
}) {
	const [items, setItems] = useState<ChecklistItem[]>([]);
	const [answers, setAnswers] = useState<Record<number, { passed: boolean; note: string }>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const supabase = createClient();
		let mounted = true;
		async function load() {
			setLoading(true);
			setError(null);
			const { data, error } = await supabase
				.from("shift_checklist_item")
				.select("id, title, description, sort_order")
				.eq("active", true)
				.order("sort_order", { ascending: true });
			if (!mounted) return;
			if (error) {
				setError(error.message);
			} else {
				setItems((data as any) || []);
			}
			setLoading(false);
		}
		load();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		const list: ChecklistAnswer[] = Object.entries(answers).map(([itemId, v]) => ({
			item_id: Number(itemId),
			passed: v.passed,
			note: v.note,
		}));
		onChange(list);
	}, [answers, onChange]);

	if (loading) return <div>Kontrol listesi yükleniyor…</div>;
	if (error) return <div className="text-red-600">Hata: {error}</div>;
	if (items.length === 0) return <div>Aktif kontrol maddesi bulunamadı.</div>;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Vardiya Çıkış Kontrol Listesi</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{items.map((item) => {
					const value = answers[item.id] || { passed: false, note: "" };
					return (
						<div key={item.id} className="border rounded-md p-3">
							<div className="flex items-start gap-3">
								<Checkbox
									id={`item-${item.id}`}
									checked={value.passed}
									onCheckedChange={(v) =>
										setAnswers((prev) => ({
											...prev,
											[item.id]: { ...prev[item.id], passed: Boolean(v) },
										}))
									}
								/>
								<div className="flex-1">
									<Label htmlFor={`item-${item.id}`} className="font-medium">
										{item.title}
									</Label>
									{item.description && (
										<div className="text-sm text-muted-foreground mt-1">
											{item.description}
										</div>
									)}
								</div>
							</div>
							<div className="mt-2">
								<Input
									placeholder="Not (opsiyonel)"
									value={value.note}
									onChange={(e) =>
										setAnswers((prev) => ({
											...prev,
											[item.id]: { ...prev[item.id], note: e.target.value },
										}))
									}
								/>
							</div>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

export default ShiftEndChecklist;
