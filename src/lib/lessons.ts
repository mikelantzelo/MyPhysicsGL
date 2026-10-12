import "server-only";

import { gunzipSync } from "node:zlib";
import { AppwriteException, Query } from "node-appwrite";

import { appwriteConfig } from "./appwrite/config";
import { createAdminClient } from "./appwrite/server";

/**
 * Πρόοδος και αναφορά εκτύπωσης των μαθημάτων (StoryLine) ανά μαθητή.
 * Το μάθημα (iframe στο site του σχολείου) τα στέλνει με postMessage μέσω
 * του shared/mpl-bridge.js· η σελίδα τα προωθεί στα lesson-actions και ο
 * server τα αποδίδει στον μαθητή της συνεδρίας. Μία γραμμή ανά μαθητή ×
 * παράγραφο, με σταθερό rowId ώστε κάθε ενημέρωση να πέφτει στην ίδια.
 */

const { databaseId } = appwriteConfig;
const TABLE = appwriteConfig.tables.lessonProgress;

/** Όριο της συμπιεσμένης αναφοράς (base64) και του αποσυμπιεσμένου HTML. */
export const MAX_REPORT_BASE64 = 1_500_000;
const MAX_REPORT_BYTES = 8_000_000;

const rowIdOf = (idStudent: number, idChapter: string) => `${idStudent}_${idChapter}`;

/** Ενημερώνει μόνο τις στήλες του `data` (το upsert θα έσβηνε τις υπόλοιπες). */
async function writeRow(rowId: string, exists: boolean, data: Record<string, unknown>) {
  const { tables } = createAdminClient();
  if (exists) await tables.updateRow({ databaseId, tableId: TABLE, rowId, data });
  else await tables.createRow({ databaseId, tableId: TABLE, rowId, data });
}

async function getRow(rowId: string) {
  const { tables } = createAdminClient();
  try {
    return (await tables.getRow({ databaseId, tableId: TABLE, rowId })) as unknown as Record<
      string,
      unknown
    >;
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) return null;
    throw e;
  }
}

export async function recordProgress(
  idStudent: number,
  idChapter: string,
  done: number,
  total: number,
) {
  const rowId = rowIdOf(idStudent, idChapter);
  const row = await getRow(rowId);
  const now = new Date().toISOString();
  const maxDone = Math.max(done, (row?.maxDone as number | undefined) ?? 0);

  await writeRow(rowId, row != null, {
    idStudent,
    idChapter,
    done,
    maxDone,
    total,
    firstSeen: (row?.firstSeen as string | undefined) ?? now,
    lastSeen: now,
    completedAt:
      (row?.completedAt as string | undefined) ?? (total > 0 && done >= total ? now : null),
  });
}

/** Η αναφορά όπως τη στέλνει η γέφυρα. */
export type LessonReport = { head: string; body: string; title: string };

/** Αποσυμπίεση + έλεγχος σχήματος· null αν δεν είναι έγκυρη. */
export function decodeReport(base64: string): LessonReport | null {
  try {
    const json = gunzipSync(Buffer.from(base64, "base64"), {
      maxOutputLength: MAX_REPORT_BYTES,
    }).toString("utf8");
    const r = JSON.parse(json) as Record<string, unknown>;
    if (typeof r.head !== "string" || typeof r.body !== "string") return null;
    return { head: r.head, body: r.body, title: typeof r.title === "string" ? r.title : "" };
  } catch {
    return null;
  }
}

/** `printed`: μετράει στις εκτυπώσεις· οι αυτόματες αποθηκεύσεις μόνο ενημερώνουν τις απαντήσεις. */
export async function saveReport(
  idStudent: number,
  idChapter: string,
  base64: string,
  printed: boolean,
) {
  const rowId = rowIdOf(idStudent, idChapter);
  const row = await getRow(rowId);
  const now = new Date().toISOString();

  await writeRow(rowId, row != null, {
    idStudent,
    idChapter,
    firstSeen: (row?.firstSeen as string | undefined) ?? now,
    lastSeen: now,
    report: base64,
    reportAt: now,
    reports: ((row?.reports as number | undefined) ?? 0) + (printed ? 1 : 0),
  });
}

export type ProgressCell = {
  idStudent: number;
  idChapter: string;
  maxDone: number;
  total: number;
  firstSeen: string | null;
  lastSeen: string | null;
  completedAt: string | null;
  reportAt: string | null;
  reports: number;
};

/** Η πρόοδος των μαθητών (χωρίς το βαρύ `report`). */
export async function listProgress(idStudents: number[]): Promise<ProgressCell[]> {
  if (idStudents.length === 0) return [];
  const { tables } = createAdminClient();
  const out: ProgressCell[] = [];
  // Query.equal δέχεται έως 100 τιμές.
  for (let i = 0; i < idStudents.length; i += 100) {
    const res = await tables.listRows({
      databaseId,
      tableId: TABLE,
      queries: [
        Query.equal("idStudent", idStudents.slice(i, i + 100)),
        Query.select([
          "idStudent",
          "idChapter",
          "maxDone",
          "total",
          "firstSeen",
          "lastSeen",
          "completedAt",
          "reportAt",
          "reports",
        ]),
        Query.limit(5000),
      ],
    });
    for (const r of res.rows as unknown as Record<string, unknown>[]) {
      out.push({
        idStudent: r.idStudent as number,
        idChapter: r.idChapter as string,
        maxDone: (r.maxDone as number) ?? 0,
        total: (r.total as number) ?? 0,
        firstSeen: (r.firstSeen as string) ?? null,
        lastSeen: (r.lastSeen as string) ?? null,
        completedAt: (r.completedAt as string) ?? null,
        reportAt: (r.reportAt as string) ?? null,
        reports: (r.reports as number) ?? 0,
      });
    }
  }
  return out;
}

/** Η τελευταία αναφορά εκτύπωσης ενός μαθητή σε μια παράγραφο. */
export async function getReport(
  idStudent: number,
  idChapter: string,
): Promise<(LessonReport & { reportAt: string }) | null> {
  const row = await getRow(rowIdOf(idStudent, idChapter));
  if (!row?.report) return null;
  const report = decodeReport(row.report as string);
  return report ? { ...report, reportAt: row.reportAt as string } : null;
}
