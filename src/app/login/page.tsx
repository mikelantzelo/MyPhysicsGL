import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getUser } from "@/lib/auth";

export const metadata = {
  title: "Σύνδεση · MyPhysics",
};

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
