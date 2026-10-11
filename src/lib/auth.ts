import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { Models } from "node-appwrite";

import { ADMIN_LEVEL_COOKIE } from "./appwrite/config";
import { createSessionClient } from "./appwrite/server";
import { LEVELS, type CurrentUser, type Level } from "./types";

export { LEVEL_LABELS } from "./types";
export type { CurrentUser, Level } from "./types";

/** Η τάξη του χρήστη από τα Appwrite user labels: `levelGA`, `levelLA`, `levelLAO`, … */
function levelFromLabels(labels: string[]): Level | null {
  for (const code of LEVELS) {
    if (labels.includes(`level${code}`)) return code;
  }
  return null;
}

/**
 * Ο τρέχων χρήστης, ή null αν δεν υπάρχει έγκυρο session.
 * Τυλιγμένο σε cache() ώστε πολλές κλήσεις στο ίδιο request να μη χτυπάνε το Appwrite ξανά.
 */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const { account, hasSession } = await createSessionClient();
  if (!hasSession) return null;

  try {
    const user: Models.User<Models.Preferences> = await account.get();
    const labels = user.labels ?? [];
    const isAdmin = labels.includes("admin");

    let level = levelFromLabels(labels);
    if (isAdmin) {
      const chosen = (await cookies()).get(ADMIN_LEVEL_COOKIE)?.value;
      level =
        (LEVELS as readonly string[]).includes(chosen ?? "")
          ? (chosen as Level)
          : (level ?? LEVELS[0]);
    }

    return {
      id: user.$id,
      name: user.name,
      email: user.email,
      level,
      labels,
      isAdmin,
    };
  } catch {
    // Ληγμένο ή άκυρο session.
    return null;
  }
});
