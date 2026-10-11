"use client";

import { useEffect, useState } from "react";
import { BellOffIcon, BellRingIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  CHAT_EVENT,
  enablePush,
  getPushState,
  getRegistration,
  syncPush,
  type PushState,
} from "./push-client";

/**
 * Σε κάθε σελίδα της εφαρμογής: εγγράφει τον service worker, ανανεώνει σιωπηλά
 * τη συνδρομή και προωθεί τα μηνύματα του service worker ως γεγονός στο window.
 */
export function PushBridge() {
  useEffect(() => {
    getRegistration()
      .then(() => syncPush())
      .catch(() => {});
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === CHAT_EVENT) {
        window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: e.data }));
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  return null;
}

const HINTS: Partial<Record<PushState, string>> = {
  "ios-install":
    "Στο iPhone: Κοινοποίηση → «Προσθήκη στην οθόνη Αφετηρίας», άνοιξε την εφαρμογή από εκεί και ενεργοποίησε τις ειδοποιήσεις.",
  denied:
    "Οι ειδοποιήσεις είναι μπλοκαρισμένες για αυτό το site. Επίτρεψέ τες από τις ρυθμίσεις του browser (εικονίδιο 🔒 δίπλα στη διεύθυνση).",
  unsupported: "Αυτός ο browser δεν υποστηρίζει ειδοποιήσεις.",
};

/** Κουμπί/ένδειξη ειδοποιήσεων για τις σελίδες συνομιλίας. */
export function NotificationsToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  if (!state) return null;

  if (state === "on") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <BellRingIcon className="size-4" />
        Ειδοποιήσεις ενεργές
      </span>
    );
  }

  if (state === "off") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const next = await enablePush();
            setState(next);
            if (next === "on") toast.success("Θα λαμβάνεις ειδοποίηση για κάθε νέο μήνυμα.");
          } catch {
            toast.error("Δεν ήταν δυνατή η ενεργοποίηση ειδοποιήσεων.");
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
      >
        {busy ? <Loader2Icon className="size-4 animate-spin" /> : <BellRingIcon className="size-4" />}
        Ενεργοποίηση ειδοποιήσεων
      </button>
    );
  }

  return (
    <span className="inline-flex max-w-md items-start gap-1.5 text-xs text-muted-foreground">
      <BellOffIcon className="mt-0.5 size-4 shrink-0" />
      {HINTS[state]}
    </span>
  );
}
