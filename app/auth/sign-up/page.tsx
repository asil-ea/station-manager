import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to login with message about sign-up being disabled
  redirect("/auth/login?message=signup_disabled");
}
