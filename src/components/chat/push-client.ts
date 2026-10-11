"use client";

import { registerPush, unregisterPush } from "@/app/chat-actions";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";

/** Γεγονός στο window όταν φτάνει push για νέο μήνυμα (το στέλνει ο service worker). */
export const CHAT_EVENT = "chat-message";

export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on";

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** iPhone/iPad: Web Push μόνο αν η εφαρμογή έχει προστεθεί στην αρχική οθόνη. */
const isIosBrowser = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !window.matchMedia("(display-mode: standalone)").matches;

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function getRegistration() {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return isIosBrowser() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return Notification.permission === "granted" && sub ? "on" : "off";
}

/** Ζητά άδεια (πρέπει να καλείται από κλικ) και αποθηκεύει τη συνδρομή στον server. */
export async function enablePush(): Promise<PushState> {
  const reg = await getRegistration();
  if (!reg) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    }));
  const res = await registerPush(sub.toJSON() as Parameters<typeof registerPush>[0]);
  return res.ok ? "on" : "off";
}

/** Σιωπηλός συγχρονισμός σε κάθε φόρτωση (αν η άδεια έχει ήδη δοθεί). */
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await registerPush(sub.toJSON() as Parameters<typeof registerPush>[0]);
}

/** Πριν την αποσύνδεση: αυτός ο browser να μη λαμβάνει ειδοποιήσεις του χρήστη. */
export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  try {
    await unregisterPush(sub.endpoint);
  } finally {
    await sub.unsubscribe();
  }
}
