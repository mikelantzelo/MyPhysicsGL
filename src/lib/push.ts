import "server-only";

import { createHash } from "node:crypto";

import { appwriteConfig } from "./appwrite/config";
import { createAdminClient } from "./appwrite/server";

/**
 * Συνδρομές Web Push (μία ανά browser/συσκευή). Τις διαβάζει το Appwrite
 * Function `chat-notify` για να στείλει ειδοποίηση όταν φτάνει νέο μήνυμα.
 */
const TABLE = "push_subscriptions";
const { databaseId } = appwriteConfig;

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Ίδιο endpoint → ίδιο rowId, ώστε μια συσκευή να μη γράφεται δύο φορές. */
const rowIdFor = (endpoint: string) =>
  createHash("sha256").update(endpoint).digest("hex").slice(0, 36);

export async function saveSubscription(
  sub: PushSubscriptionInput,
  owner: { userId: string; role: "teacher" | "student"; idStudent: number | null },
  userAgent: string,
) {
  if (!/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error("Μη έγκυρη συνδρομή ειδοποιήσεων.");
  }
  const { tables } = createAdminClient();
  await tables.upsertRow({
    databaseId,
    tableId: TABLE,
    rowId: rowIdFor(sub.endpoint),
    data: {
      userId: owner.userId,
      role: owner.role,
      idStudent: owner.idStudent,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: userAgent.slice(0, 255),
    },
  });
}

/** Διαγραφή μιας συνδρομής — μόνο αν ανήκει στον χρήστη που τη ζητά. */
export async function deleteSubscription(endpoint: string, userId: string) {
  const { tables } = createAdminClient();
  const rowId = rowIdFor(endpoint);
  try {
    const row = await tables.getRow({ databaseId, tableId: TABLE, rowId });
    if (row.userId !== userId) return;
    await tables.deleteRow({ databaseId, tableId: TABLE, rowId });
  } catch {
    // Δεν υπήρχε.
  }
}
