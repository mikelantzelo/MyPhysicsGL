"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppwriteException } from "node-appwrite";

import { SESSION_COOKIE } from "@/lib/appwrite/config";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";

export type LoginState = { error: string | null };

/**
 * Ο μαθητής μπαίνει μόνο με έναν μοναδικό κωδικό. Στο Appwrite ο κάθε χρήστης
 * έχει ψεύτικο email `<κωδικός>@myphysics.local` και ο ίδιος ο κωδικός = password.
 */
const LOGIN_EMAIL_DOMAIN = "myphysics.local";

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Οι κωδικοί είναι πεζοί· κανονικοποιούμε ώστε email ΚΑΙ password να ταιριάζουν
  // ακόμα κι αν ο μαθητής (ή το κινητό) γράψει κεφαλαία.
  const code = String(formData.get("code") ?? "").trim().toLowerCase();

  if (!code) {
    return { error: "Γράψε τον κωδικό σου." };
  }

  const email = `${code}@${LOGIN_EMAIL_DOMAIN}`;

  try {
    const { account } = createAdminClient();
    const session = await account.createEmailPasswordSession({
      email,
      password: code,
    });

    (await cookies()).set(SESSION_COOKIE, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(session.expire),
      path: "/",
    });
  } catch (err) {
    if (err instanceof AppwriteException) {
      console.error(
        `Appwrite login error → code=${err.code} type=${err.type} message=${err.message}`,
      );

      // Πραγματικά λάθος στοιχεία χρήστη.
      if (
        err.type === "user_invalid_credentials" ||
        err.type === "user_not_found" ||
        err.type === "user_blocked"
      ) {
        return { error: "Λάθος κωδικός." };
      }

      // Οτιδήποτε άλλο (λάθος API key/scope, λάθος project, endpoint κ.λπ.)
      const detail =
        process.env.NODE_ENV === "production"
          ? ""
          : ` (${err.type ?? "unknown"} / ${err.code})`;
      return { error: `Πρόβλημα σύνδεσης με τον server.${detail}` };
    }

    console.error("Άγνωστο σφάλμα σύνδεσης:", err);
    return { error: "Κάτι πήγε στραβά. Δοκίμασε ξανά." };
  }

  redirect("/");
}

export async function logout() {
  try {
    const { account, hasSession } = await createSessionClient();
    if (hasSession) {
      await account.deleteSession({ sessionId: "current" });
    }
  } catch {
    // Ό,τι κι αν συμβεί, καθαρίζουμε το cookie παρακάτω.
  }

  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
