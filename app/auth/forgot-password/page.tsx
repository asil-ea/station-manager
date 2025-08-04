import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to login with message about forgot password being disabled
  redirect("/auth/login?message=forgot_password_disabled");
}
