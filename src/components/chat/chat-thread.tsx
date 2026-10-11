"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2Icon, SendHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

import type { ChatMessage, Sender } from "@/lib/chat";

import { CHAT_EVENT } from "./push-client";

/** Εφεδρικός έλεγχος· τα νέα μηνύματα έρχονται κανονικά αμέσως μέσω push. */
const POLL_MS = 20_000;
const MAX = 2000;

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Σήμερα";
  if (d.toDateString() === yesterday.toDateString()) return "Χθες";
  return d.toLocaleDateString("el", { weekday: "long", day: "numeric", month: "long" });
};
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("el", { hour: "2-digit", minute: "2-digit" });

/**
 * Μια συνομιλία καθηγητή ↔ μαθητή. `me` = ποιος γράφει από αυτή την πλευρά.
 * Νέα μηνύματα: αμέσως όταν φτάνει push (service worker), αλλιώς έλεγχος κάθε
 * 20″ μόνο όσο η καρτέλα είναι ορατή.
 */
export function ChatThread({
  me,
  initial,
  load,
  send,
  otherName,
}: {
  me: Sender;
  initial: ChatMessage[];
  load: (since?: string) => Promise<ChatMessage[]>;
  send: (text: string) => Promise<ChatMessage>;
  otherName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<string | undefined>(initial.at(-1)?.sentTime);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      next.sort((a, b) => a.sentTime.localeCompare(b.sentTime));
      lastTimeRef.current = next.at(-1)?.sentTime;
      return next;
    });
  }, []);

  // Polling για νέα μηνύματα.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden) {
        try {
          merge(await load(lastTimeRef.current));
        } catch {
          // Προσωρινό πρόβλημα δικτύου — ξαναδοκιμάζουμε στον επόμενο κύκλο.
        }
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    const onPush = () => {
      clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(CHAT_EVENT, onPush);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(CHAT_EVENT, onPush);
    };
  }, [load, merge]);

  // Κύλιση στο τελευταίο μήνυμα.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      merge([await send(value)]);
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Το μήνυμα δεν στάλθηκε.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 sm:p-4">
        {messages.length === 0 && (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            Δεν υπάρχουν μηνύματα ακόμα. Γράψε το πρώτο μήνυμα προς {otherName}.
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender === me;
          const newDay =
            i === 0 || dayLabel(messages[i - 1].sentTime) !== dayLabel(m.sentTime);
          return (
            <div key={m.id} className="flex flex-col">
              {newDay && (
                <span className="my-2 self-center rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">
                  {dayLabel(m.sentTime)}
                </span>
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm sm:max-w-[70%] ${
                  mine
                    ? "self-end rounded-br-md bg-primary text-primary-foreground"
                    : "self-start rounded-bl-md bg-muted"
                }`}
              >
                {m.text}
                <span
                  className={`mt-0.5 block text-right text-[10px] ${
                    mine ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {timeLabel(m.sentTime)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 border-t p-2 sm:p-3"
      >
        <textarea
          value={text}
          maxLength={MAX}
          rows={1}
          placeholder={`Μήνυμα προς ${otherName}…`}
          aria-label="Μήνυμα"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 min-h-9 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none [field-sizing:content] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Αποστολή"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SendHorizontalIcon className="size-4" />
          )}
        </button>
      </form>
    </div>
  );
}
