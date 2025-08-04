import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to login with message about update password being disabled
  redirect("/auth/login?message=update_password_disabled");
}
