"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fetchStudentMessages, sendToStudent } from "@/app/chat-actions";
import { NativeSelect } from "@/components/ui/native-select";
import type { ChatMessage, InboxItem } from "@/lib/chat";

import { ChatThread } from "./chat-thread";

const INBOX_REFRESH_MS = 15000;

const shortTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("el", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("el", { day: "numeric", month: "short" });
};

/** Η συνομιλία με έναν μαθητή, με δεμένο το idStudent στα actions. */
export function TeacherThread({
  idStudent,
  name,
  initial,
}: {
  idStudent: number;
  name: string;
  initial: ChatMessage[];
}) {
  const load = useCallback((since?: string) => fetchStudentMessages(idStudent, since), [idStudent]);
  const send = useCallback((text: string) => sendToStudent(idStudent, text), [idStudent]);
  return <ChatThread me="teacher" otherName={name} initial={initial} load={load} send={send} />;
}

/** Λίστα συνομιλιών· ανανεώνεται μόνη της κάθε 15″ (μόνο αν η καρτέλα είναι ορατή). */
export function Inbox({ items, active }: { items: InboxItem[]; active: number | null }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, INBOX_REFRESH_MS);
    return () => clearInterval(t);
  }, [router]);

  if (!items.length) {
    return (
      <p className="p-4 text-center text-sm text-muted-foreground">
        Καμία συνομιλία ακόμα.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((c) => (
        <li key={c.idStudent}>
          <Link
            href={`/admin/messages?student=${c.idStudent}`}
            className={`flex flex-col gap-0.5 px-3 py-2.5 hover:bg-muted ${
              c.idStudent === active ? "bg-primary/10" : ""
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`min-w-0 flex-1 truncate text-sm ${c.unread ? "font-semibold" : ""}`}>
                {c.name}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {shortTime(c.lastMessageTime)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {c.section ? `${c.section} · ` : ""}
                {c.lastMessage}
              </span>
              {c.unread > 0 && (
                <span className="shrink-0 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {c.unread}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** «Νέο μήνυμα»: επιλογή οποιουδήποτε μαθητή με κωδικό, ομαδοποιημένοι ανά τμήμα. */
export function NewMessagePicker({
  students,
}: {
  students: { idStudent: number; name: string; section: string }[];
}) {
  const router = useRouter();
  const sections = [...new Set(students.map((s) => s.section))];
  return (
    <NativeSelect
      aria-label="Νέο μήνυμα σε μαθητή"
      value=""
      onChange={(e) => e.target.value && router.push(`/admin/messages?student=${e.target.value}`)}
    >
      <option value="">✉ Νέο μήνυμα σε…</option>
      {sections.map((sec) => (
        <optgroup key={sec} label={sec}>
          {students
            .filter((s) => s.section === sec)
            .map((s) => (
              <option key={s.idStudent} value={s.idStudent}>
                {s.name}
              </option>
            ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
