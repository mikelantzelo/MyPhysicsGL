"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ID, Query } from "node-appwrite";

import { normalizeQuestions } from "@/components/quiz/lib/questions";

import { requireAdmin } from "@/lib/admin";
import { ADMIN_LEVEL_COOKIE, appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite/server";
import { LEVELS, type Level } from "@/lib/types";

/** Ο admin αλλάζει την τάξη που βλέπει (μενού, καρτέλες, quiz). */
export async function setAdminLevel(level: Level) {
  await requireAdmin();
  if (!LEVELS.includes(level)) return;

  (await cookies()).set(ADMIN_LEVEL_COOKIE, level, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}

/**
 * Ορίζει (ή καθαρίζει, με null) την ενεργή παράγραφο ενός τμήματος.
 * Μία γραμμή ανά τμήμα στον πίνακα `active`, με rowId = idSection.
 */
export async function setSectionActive(sectionId: number, nodeId: string | null) {
  await requireAdmin();
  if (!Number.isInteger(sectionId)) throw new Error("Μη έγκυρο τμήμα.");

  const { tables } = createAdminClient();
  const { databaseId } = appwriteConfig;
  const tableId = appwriteConfig.tables.active;
  const rowId = String(sectionId);

  if (nodeId) {
    await tables.upsertRow({
      databaseId,
      tableId,
      rowId,
      data: {
        idActive: sectionId,
        idSection: sectionId,
        active: nodeId,
        dateOfUpdate: new Date().toISOString().slice(0, 10),
      },
    });
  } else {
    try {
      await tables.deleteRow({ databaseId, tableId, rowId });
    } catch {
      // Δεν υπήρχε ενεργή παράγραφος.
    }
  }

  revalidatePath("/", "layout");
}

export type QuestionInput = {
  idChapter: string;
  questionNumber: number;
  questionText: string;
  questionImage: string;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  answerE: string;
  correctAnswer: string;
};

const ANSWER_KEYS = ["answerA", "answerB", "answerC", "answerD", "answerE"] as const;

/**
 * Ελέγχει μια ερώτηση με τον ΙΔΙΟ κώδικα που χρησιμοποιεί το quiz, ώστε ό,τι
 * αποθηκεύεται να παίζει σίγουρα. Επιστρέφει μήνυμα λάθους ή null.
 */
function validateQuestion(q: QuestionInput): string | null {
  if (!q.idChapter) return "Λείπει η παράγραφος.";
  try {
    normalizeQuestions([{ ...q, idQuestion: "check" }]);
  } catch (e) {
    return e instanceof Error ? e.message : "Μη έγκυρη ερώτηση.";
  }
  if (
    [3, 4, 5].includes(q.questionNumber) &&
    ANSWER_KEYS.filter((k) => q[k].trim()).length < 2
  ) {
    return "Χρειάζονται τουλάχιστον 2 απαντήσεις.";
  }
  return null;
}

function toRowData(q: QuestionInput) {
  const opt = (v: string) => (v.trim() ? v.trim() : null);
  return {
    idChapter: q.idChapter,
    questionNumber: q.questionNumber,
    questionText: q.questionText.trim(),
    questionImage: opt(q.questionImage),
    imgNumber: null,
    answerA: opt(q.answerA),
    answerB: opt(q.answerB),
    answerC: opt(q.answerC),
    answerD: opt(q.answerD),
    answerE: opt(q.answerE),
    correctAnswer: q.correctAnswer.trim(),
  };
}

async function nextQuestionIds(count: number): Promise<number[]> {
  const { tables } = createAdminClient();
  const last = await tables.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.tables.question,
    queries: [Query.orderDesc("idQuestion"), Query.limit(1)],
  });
  const start = ((last.rows[0]?.idQuestion as number | undefined) ?? 0) + 1;
  return Array.from({ length: count }, (_, i) => start + i);
}

/** Νέα ερώτηση (χωρίς rowId) ή ενημέρωση υπάρχουσας. */
export async function saveQuestion(
  input: QuestionInput,
  rowId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const error = validateQuestion(input);
  if (error) return { ok: false, error };

  const { tables } = createAdminClient();
  const { databaseId } = appwriteConfig;
  const tableId = appwriteConfig.tables.question;

  if (rowId) {
    await tables.updateRow({ databaseId, tableId, rowId, data: toRowData(input) });
  } else {
    const [idQuestion] = await nextQuestionIds(1);
    await tables.createRow({
      databaseId,
      tableId,
      rowId: ID.unique(),
      data: { ...toRowData(input), idQuestion },
    });
  }
  revalidatePath("/admin/questions");
  return { ok: true };
}

export async function deleteQuestion(rowId: string) {
  await requireAdmin();
  const { tables } = createAdminClient();
  await tables.deleteRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.tables.question,
    rowId,
  });
  revalidatePath("/admin/questions");
}

/**
 * Εισαγωγή ερωτήσεων από CSV (Excel → «CSV UTF-8»). Πρώτη γραμμή = επικεφαλίδες:
 * questionNumber, questionText, answerA…answerE, correctAnswer, [questionImage], [idChapter].
 * Χωρίς στήλη idChapter, όλες πάνε στην επιλεγμένη παράγραφο.
 * Όλα ή τίποτα: αν μία γραμμή είναι λάθος, δεν αποθηκεύεται καμία.
 */
export async function importQuestions(
  defaultChapter: string,
  csv: string,
): Promise<{ ok: true; count: number } | { ok: false; errors: string[] }> {
  await requireAdmin();

  const rows = parseCsv(csv.replace(/^﻿/, ""));
  if (rows.length < 2) {
    return { ok: false, errors: ["Το αρχείο δεν έχει γραμμές ερωτήσεων."] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  for (const required of ["questionNumber", "questionText", "correctAnswer"]) {
    if (col(required) < 0) return { ok: false, errors: [`Λείπει η στήλη «${required}».`] };
  }

  const inputs: QuestionInput[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return; // κενή γραμμή
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "") : "");
    const q: QuestionInput = {
      idChapter: get("idChapter").trim() || defaultChapter,
      questionNumber: Number(get("questionNumber")),
      questionText: get("questionText"),
      questionImage: get("questionImage"),
      answerA: get("answerA"),
      answerB: get("answerB"),
      answerC: get("answerC"),
      answerD: get("answerD"),
      answerE: get("answerE"),
      correctAnswer: get("correctAnswer"),
    };
    const error = validateQuestion(q);
    if (error) errors.push(`Γραμμή ${i + 2}: ${error}`);
    else inputs.push(q);
  });

  if (errors.length) return { ok: false, errors };
  if (!inputs.length) return { ok: false, errors: ["Δεν βρέθηκαν ερωτήσεις."] };

  const { tables } = createAdminClient();
  const ids = await nextQuestionIds(inputs.length);
  for (const [i, q] of inputs.entries()) {
    await tables.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.tables.question,
      rowId: ID.unique(),
      data: { ...toRowData(q), idQuestion: ids[i] },
    });
  }
  revalidatePath("/admin/questions");
  return { ok: true, count: inputs.length };
}

/** Μικρός CSV parser: εισαγωγικά, αλλαγές γραμμής μέσα σε κελιά, διαχωριστικό ; , ή tab. */
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length,
  )[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
