import "server-only";

import { ID, Query } from "node-appwrite";

import { appwriteConfig } from "./appwrite/config";
import { createAdminClient } from "./appwrite/server";

/**
 * Προγραμματισμένα τεστ/διαγωνίσματα (όπως τα «Τεστ & Διαγωνίσματα» του
 * MyClass). Η υπενθύμιση (`remindAt`, την παραμονή σε ώρα που διαλέγει ο
 * καθηγητής) στέλνεται ως push από το Appwrite Function «exam-reminders»,
 * που τρέχει κάθε 15′ και σημειώνει `sent`.
 */

const { databaseId } = appwriteConfig;
const TABLE = "exam_reminder";
const TIME_ZONE = "Europe/Athens";

export type Exam = {
  rowId: string;
  idSection: number;
  examType: string;
  /** yyyy-MM-dd */
  examDate: string;
  details: string;
  /** ISO (UTC) ή null = χωρίς υπενθύμιση */
  remindAt: string | null;
  notifyStudents: boolean;
  sent: boolean;
};

const toExam = (r: Record<string, unknown>): Exam => ({
  rowId: r.$id as string,
  idSection: r.idSection as number,
  examType: String(r.examType ?? ""),
  examDate: String(r.examDate ?? ""),
  details: String(r.details ?? ""),
  remindAt: (r.remindAt as string | null) ?? null,
  notifyStudents: r.notifyStudents === true,
  sent: r.sent === true,
});

/** Ώρα Ελλάδας (ημερομηνία + ώρα) → ISO UTC, με σωστή θερινή/χειμερινή ώρα. */
export function athensToUtc(date: string, hour: number, minute: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (shown - guess)).toISOString();
}

/** Η μέρα πριν από μια ημερομηνία (yyyy-MM-dd). */
export function dayBefore(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export function todayInAthens(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/** Τεστ τμημάτων (όλων αν `sections` λείπει), από `from` και μετά ή όλα. */
export async function listExams(opts: { sections?: number[]; from?: string } = {}): Promise<Exam[]> {
  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId,
    tableId: TABLE,
    queries: [
      ...(opts.sections ? [Query.equal("idSection", opts.sections)] : []),
      ...(opts.from ? [Query.greaterThanEqual("examDate", opts.from)] : []),
      Query.orderAsc("examDate"),
      Query.limit(500),
    ],
  });
  return (res.rows as unknown as Record<string, unknown>[]).map(toExam);
}

export async function saveExam(
  rowId: string | null,
  exam: Omit<Exam, "rowId" | "sent">,
) {
  const { tables } = createAdminClient();
  // Νέα ώρα υπενθύμισης → ξαναστέλνεται.
  const data = { ...exam, sent: false };
  if (rowId) await tables.updateRow({ databaseId, tableId: TABLE, rowId, data });
  else await tables.createRow({ databaseId, tableId: TABLE, rowId: ID.unique(), data });
}

export async function deleteExam(rowId: string) {
  const { tables } = createAdminClient();
  await tables.deleteRow({ databaseId, tableId: TABLE, rowId });
}
