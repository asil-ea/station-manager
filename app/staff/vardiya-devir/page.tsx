import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResponsiveHeader } from "@/components/common/responsive-header";
import ShiftStartForm from "@/components/staff/vardiya-devir/shift-start-form";
import PendingApprovals from "@/components/staff/vardiya-devir/pending-approvals";

export default async function Page() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/auth/login");

	const { data: details } = await supabase
		.from("user_details")
		.select("name")
		.eq("uid", user.id)
		.single();

	return (
		<div className="min-h-screen flex flex-col">
			<ResponsiveHeader title="Vardiya Devir" userEmail={user.email} userName={details?.name} />
			<main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-6">
				<ShiftStartForm />
				<PendingApprovals />
			</main>
		</div>
	);
}

