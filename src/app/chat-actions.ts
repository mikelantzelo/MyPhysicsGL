"use server";

import { headers } from "next/headers";

import { requireAdmin } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import {
  getThread,
  markRead,
  sendMessage,
  unreadForStudent,
  unreadForTeacher,
  type ChatMessage,
} from "@/lib/chat";
import { getStudentId } from "@/lib/data";
import {
  deleteSubscription,
  saveSubscription,
  type PushSubscriptionInput,
} from "@/lib/push";

/**
 * Ο μαθητής βλέπει ΜΟΝΟ τη δική του συνομιλία: το idStudent βγαίνει από τη
 * σύνδεση στον server, ποτέ από τον browser. Ο καθηγητής (admin) βλέπει όλες.
 */
async function myStudentId(): Promise<number> {
  const user = await getUser();
  if (!user) throw new Error("Δεν είσαι συνδεδεμένος.");
  const id = await getStudentId(user.id);
  if (id == null) throw new Error("Ο λογαριασμός σου δεν είναι συνδεδεμένος με μαθητή.");
  return id;
}

// ── Μαθητής ──────────────────────────────────────────────────────────────

export async function fetchMyMessages(since?: string): Promise<ChatMessage[]> {
  const id = await myStudentId();
  const messages = await getThread(id, since);
  if (messages.some((m) => m.sender === "teacher")) await markRead(id, "student");
  return messages;
}

export async function sendMyMessage(text: string): Promise<ChatMessage> {
  return sendMessage(await myStudentId(), "student", text);
}

// ── Καθηγητής ────────────────────────────────────────────────────────────

export async function fetchStudentMessages(
  idStudent: number,
  since?: string,
): Promise<ChatMessage[]> {
  await requireAdmin();
  const messages = await getThread(idStudent, since);
  if (messages.some((m) => m.sender === "student")) await markRead(idStudent, "teacher");
  return messages;
}

export async function sendToStudent(idStudent: number, text: string): Promise<ChatMessage> {
  await requireAdmin();
  if (!Number.isInteger(idStudent)) throw new Error("Μη έγκυρος μαθητής.");
  return sendMessage(idStudent, "teacher", text);
}

// ── Ειδοποιήσεις (Web Push) ──────────────────────────────────────────────

/** Ο browser ενεργοποίησε ειδοποιήσεις → η συνδρομή του αποθηκεύεται για τον συνδεδεμένο χρήστη. */
export async function registerPush(sub: PushSubscriptionInput): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };
  const idStudent = user.isAdmin ? null : await getStudentId(user.id);
  if (!user.isAdmin && idStudent == null) return { ok: false };
  const ua = (await headers()).get("user-agent") ?? "";
  await saveSubscription(
    sub,
    { userId: user.id, role: user.isAdmin ? "teacher" : "student", idStudent },
    ua,
  );
  return { ok: true };
}

/** Πριν την αποσύνδεση: αυτός ο browser να μη λαμβάνει πια ειδοποιήσεις του χρήστη. */
export async function unregisterPush(endpoint: string) {
  const user = await getUser();
  if (user) await deleteSubscription(endpoint, user.id);
}

// ── Σήμα αδιάβαστων (sidebar) ────────────────────────────────────────────

export async function fetchUnreadCount(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  if (user.isAdmin) return unreadForTeacher();
  const id = await getStudentId(user.id);
  return id == null ? 0 : unreadForStudent(id);
}
