"use client";

import { useEffect, type RefObject } from "react";
import { toast } from "sonner";

import { reportLessonProgress, submitLessonReport } from "@/app/lesson-actions";

/**
 * Ακούει το μάθημα της καρτέλας «Παρουσίαση» (shared/mpl-bridge.js στο site
 * του σχολείου) και προωθεί στον server την πρόοδο και τις απαντήσεις.
 * Δέχεται μηνύματα μόνο από το συγκεκριμένο iframe και το origin του.
 *
 * Ένας κοινός listener με μητρώο iframe → παράγραφος, ώστε όταν ο μαθητής
 * φεύγει από την παράγραφο (το iframe αφαιρείται) να προλαβαίνουμε την
 * τελευταία αυτόματη αποστολή του μαθήματος (pagehide).
 */

type Lesson = { origin: string; idChapter: string };
type Mounted = Lesson & { iframe: RefObject<HTMLIFrameElement | null> };

/** Οι καρτέλες «Παρουσίαση» που είναι ανοιχτές τώρα. */
const mounted = new Set<Mounted>();
/**
 * Παράθυρο μαθήματος → παράγραφος, από το πρώτο του μήνυμα (η πρόοδος στέλνεται
 * μόλις φορτώσει). Μένει για λίγο αφού κλείσει η καρτέλα, για την τελευταία αποστολή.
 */
const lessons = new Map<MessageEventSource, Lesson>();
let listening = false;

/** Πόσο μένει ενεργή η εγγραφή αφού φύγει το iframe. */
const GRACE_MS = 10_000;

function lessonOf(source: MessageEventSource): Lesson | undefined {
  const known = lessons.get(source);
  if (known) return known;
  for (const m of mounted) {
    if (m.iframe.current?.contentWindow === source) {
      const lesson = { origin: m.origin, idChapter: m.idChapter };
      lessons.set(source, lesson);
      return lesson;
    }
  }
}

function onMessage(event: MessageEvent) {
  const lesson = event.source ? lessonOf(event.source) : undefined;
  if (!lesson || event.origin !== lesson.origin) return;
  const msg = event.data as Record<string, unknown> | null;
  if (!msg || msg.source !== "mpl-lesson") return;

  if (msg.type === "progress") {
    void reportLessonProgress(lesson.idChapter, Number(msg.done), Number(msg.total)).catch(
      () => {},
    );
  } else if (msg.type === "report") {
    void sendReport(lesson.idChapter, msg);
  }
}

export function useLessonBridge(
  iframe: RefObject<HTMLIFrameElement | null>,
  src: string | undefined,
  idChapter: string,
) {
  useEffect(() => {
    if (!src) return;
    const entry: Mounted = { iframe, origin: new URL(src).origin, idChapter };
    mounted.add(entry);
    if (!listening) {
      window.addEventListener("message", onMessage);
      listening = true;
    }
    return () => {
      mounted.delete(entry);
      // Τα παράθυρα αυτής της παραγράφου ξεχνιούνται μετά την προθεσμία.
      setTimeout(() => {
        for (const [win, lesson] of lessons) {
          if (lesson.idChapter === idChapter && ![...mounted].some((m) => m.idChapter === idChapter)) {
            lessons.delete(win);
          }
        }
      }, GRACE_MS);
    };
  }, [iframe, src, idChapter]);
}

async function sendReport(idChapter: string, msg: Record<string, unknown>) {
  const auto = msg.auto === true;
  const report = await gzipBase64(
    JSON.stringify({
      head: String(msg.head ?? ""),
      body: String(msg.body ?? ""),
      title: String(msg.title ?? ""),
    }),
  );

  // Η σελίδα κλείνει/κρύβεται: beacon, που ολοκληρώνεται και μετά το κλείσιμο.
  if (auto && document.visibilityState === "hidden") {
    const body = new Blob([JSON.stringify({ idChapter, report })], { type: "application/json" });
    if (navigator.sendBeacon("/api/lesson/report", body)) return;
  }

  try {
    const result = await submitLessonReport(idChapter, report, !auto);
    if (auto) return; // αθόρυβα
    if (result.saved) toast.success(result.message);
    else if (result.message) toast.info(result.message);
  } catch {
    if (!auto) toast.error("Η εργασία δεν στάλθηκε. Δοκίμασε να την εκτυπώσεις ξανά.");
  }
}

async function gzipBase64(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
