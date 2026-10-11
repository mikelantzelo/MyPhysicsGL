import "server-only";

import { notFound } from "next/navigation";
import { Query } from "node-appwrite";

import { appwriteConfig } from "./appwrite/config";
import { createAdminClient } from "./appwrite/server";
import { getUser } from "./auth";
import { LEVELS, type CurrentUser, type Level } from "./types";

/** Ο συνδεδεμένος admin· αλλιώς 404 (δεν αποκαλύπτουμε ότι υπάρχει το /admin). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getUser();
  if (!user?.isAdmin) notFound();
  return user;
}

export type Section = {
  id: number;
  /** π.χ. «Α1» */
  label: string;
  level: Level | null;
  students: number;
  /** Ιδιαίτερο τμήμα (εκτός σχολείου) με δική του τάξη στη στήλη `level`. */
  custom: boolean;
};

/** Τάξη Γυμνασίου από το όνομα του classRoom (Α/Β/Γ). */
const CLASSROOM_LEVEL: Record<string, Level> = { Α: "GA", Β: "GB", Γ: "GC" };

async function listAll(tableId: string, queries: string[] = []) {
  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId,
    queries: [...queries, Query.limit(5000)],
  });
  return res.rows as unknown as Record<string, unknown>[];
}

export async function listSections(): Promise<Section[]> {
  const [sections, classRooms, links] = await Promise.all([
    listAll("section"),
    listAll("classRoom"),
    listAll(appwriteConfig.tables.sectionStudents),
  ]);

  const levelByClassRoom = new Map(
    classRooms.map((c) => [c.id as number, CLASSROOM_LEVEL[c.name as string] ?? null]),
  );
  const students = new Map<number, number>();
  for (const l of links) {
    const s = l.idSection as number;
    students.set(s, (students.get(s) ?? 0) + 1);
  }

  return sections
    .map((s) => {
      const custom = (LEVELS as readonly string[]).includes(s.level as string);
      return {
        id: s.id as number,
        label: custom ? String(s.name) : `${s.name}${s.number}`,
        level: custom
          ? (s.level as Level)
          : (levelByClassRoom.get(s.idClassRoom as number) ?? null),
        students: students.get(s.id as number) ?? 0,
        custom,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "el"));
}

/** idSection → $id του ενεργού κόμβου (η πιο πρόσφατη γραμμή ανά τμήμα). */
export async function getActiveBySection(): Promise<Map<number, string>> {
  const rows = await listAll(appwriteConfig.tables.active, [Query.orderDesc("$updatedAt")]);
  const map = new Map<number, string>();
  for (const r of rows) {
    const s = r.idSection as number;
    if (r.active && !map.has(s)) map.set(s, r.active as string);
  }
  return map;
}

export type ResultRow = {
  rowId: string;
  student: string;
  idChapter: string;
  score: number;
  sumQuestions: number;
  attempt: number;
  timePass: string;
  dateOfQuiz: string;
  createdAt: string;
};

export type QuestionRow = {
  rowId: string;
  idQuestion: number;
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

/** Οι ερωτήσεις ενός κόμβου, με τη σειρά που δημιουργήθηκαν. */
export async function listQuestions(idChapter: string): Promise<QuestionRow[]> {
  const rows = await listAll(appwriteConfig.tables.question, [
    Query.equal("idChapter", idChapter),
    Query.orderAsc("idQuestion"),
  ]);
  const text = (v: unknown) => (v == null ? "" : String(v));
  return rows.map((r) => ({
    rowId: r.$id as string,
    idQuestion: r.idQuestion as number,
    idChapter: r.idChapter as string,
    questionNumber: r.questionNumber as number,
    questionText: text(r.questionText),
    questionImage: text(r.questionImage),
    answerA: text(r.answerA),
    answerB: text(r.answerB),
    answerC: text(r.answerC),
    answerD: text(r.answerD),
    answerE: text(r.answerE),
    correctAnswer: text(r.correctAnswer),
  }));
}

/** Αποτελέσματα quiz των μαθητών ενός τμήματος (προαιρετικά μιας παραγράφου). */
export async function getSectionResults(
  sectionId: number,
  idChapter?: string,
): Promise<ResultRow[]> {
  const links = await listAll(appwriteConfig.tables.sectionStudents, [
    Query.equal("idSection", sectionId),
  ]);
  const ids = links.map((l) => l.idStudent as number);
  if (ids.length === 0) return [];

  const [students, results] = await Promise.all([
    listAll(appwriteConfig.tables.student, [Query.equal("id", ids)]),
    listAll(appwriteConfig.tables.result, [
      Query.equal("idStudent", ids),
      ...(idChapter ? [Query.equal("idChapter", idChapter)] : []),
      Query.orderDesc("$createdAt"),
    ]),
  ]);

  const names = new Map(
    students.map((s) => [s.id as number, `${s.lastName ?? ""} ${s.firstName ?? ""}`.trim()]),
  );

  return results.map((r) => ({
    rowId: r.$id as string,
    student: names.get(r.idStudent as number) ?? `#${r.idStudent}`,
    idChapter: r.idChapter as string,
    score: Number(r.score),
    sumQuestions: r.sumQuestions as number,
    attempt: r.attempt as number,
    timePass: r.timePass as string,
    dateOfQuiz: r.dateOfQuiz as string,
    createdAt: r.$createdAt as string,
  }));
}
