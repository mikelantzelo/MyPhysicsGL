import "server-only";

import { cache } from "react";
import type { Models } from "node-appwrite";

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
    return {
      id: user.$id,
      name: user.name,
      email: user.email,
      level: levelFromLabels(user.labels ?? []),
      labels: user.labels ?? [],
    };
  } catch {
    // Ληγμένο ή άκυρο session.
    return null;
  }
});
