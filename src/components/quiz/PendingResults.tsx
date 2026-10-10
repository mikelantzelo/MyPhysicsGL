"use client";

import { useEffect, useState } from "react";
import { pendingResults, sendSavedResult } from "@/components/quiz/lib/outbox";
export function PendingResults({ idStudent, idChapter }: { idStudent: number; idChapter: string }) {
  const [entries, setEntries] = useState(pendingResults);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => setEntries(pendingResults());
    window.addEventListener("quiz-outbox-change", refresh);
    return () => window.removeEventListener("quiz-outbox-change", refresh);
  }, []);
  const own = entries.filter((entry) => entry.payload.idStudent === idStudent && entry.payload.idChapter === idChapter);
  if (!own.length) return null;
  return <div role="status" className="mb-4 p-4 rounded-xl bg-amber-50 text-amber-900 border border-amber-300">
    <p>Υπάρχουν {own.length} αποτελέσματα χωρίς επιβεβαίωση αποθήκευσης.</p>
    <button type="button" disabled={sending} className="underline font-bold p-2" onClick={async () => {
      setSending(true); setError("");
      try { for (const entry of own) await sendSavedResult(entry); }
      catch { setError("Η αποστολή δεν επιβεβαιώθηκε. Δοκίμασε ξανά όταν έχεις σύνδεση."); }
      finally { setEntries(pendingResults()); setSending(false); }
    }}>{sending ? "Αποστολή…" : "Αποστολή αποθηκευμένων αποτελεσμάτων"}</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
