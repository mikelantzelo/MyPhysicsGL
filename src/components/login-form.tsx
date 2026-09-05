"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "sonner";

import { login, type LoginState } from "@/app/actions";
import { SCHOOL_NAME, SCHOOL_YEAR } from "@/lib/branding";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Σύνδεση…" : "Σύνδεση"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-3xl font-bold text-white shadow-lg">
          Φ
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">{SCHOOL_NAME}</h1>
          <p className="text-sm text-white/50">{SCHOOL_YEAR}</p>
        </div>
      </div>

      <form action={formAction} className="mt-6 flex flex-col gap-3">
        <div className="relative">
          <input
            name="code"
            type={show ? "text" : "password"}
            placeholder="Γράψε τον κωδικό σου!"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-white/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 transition hover:text-white"
          >
            {show ? (
              <EyeOffIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </button>
        </div>

        {state.error ? (
          <p className="text-sm text-rose-300">{state.error}</p>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
