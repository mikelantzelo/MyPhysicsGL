import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getUser } from "@/lib/auth";
import { SCHOOL_NAME } from "@/lib/branding";

export const metadata = {
  title: `Σύνδεση · ${SCHOOL_NAME}`,
};

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden bg-[#0a0f1c] p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_25%_-10%,#1c2b48_0%,#0f1a30_45%,#0a0f1c_75%)]"
      />
      <div className="relative w-full max-w-xs">
        <LoginForm />
      </div>
    </main>
  );
}
