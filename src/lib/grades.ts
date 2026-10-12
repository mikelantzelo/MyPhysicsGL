import "server-only";

import { Query } from "node-appwrite";

import { appwriteConfig } from "./appwrite/config";
import { createAdminClient } from "./appwrite/server";

/**
 * Βαθμολογία τμήματος, όπως στο MyClass (Android): μια «βαθμολογία» (`score`)
 * είναι ημερομηνία + τίτλος (`gradeType`: Τεστ, Διαγώνισμα…) + μάθημα
 * (`lesson`) + είδος/κλίμακα (`scoreType`: Αριθμητικό 0–20…) + λεπτομέρειες,
 * και έχει έναν βαθμό ανά μαθητή (`studentScore`: βαθμός, απουσία, σχόλια,
 * χρώμα κελιού). Οι πίνακες μεταφέρθηκαν από το MyClass· εδώ:
 *   score.idSection   το τμήμα (προστέθηκε· το παλιό idClassRoom δεν χρησιμοποιείται)
 *   score.idScore     το είδος/κλίμακα (`scoreType.id`)
 *   score.Details     οι λεπτομέρειες (ελεύθερο κείμενο)
 *   score.scoreDate   «dd-MM-yyyy», όπως στα δεδομένα του MyClass
 * Γραμμή `studentScore` υπάρχει μόνο για μαθητή με βαθμό, απουσία ή σχόλιο.
 */

const { databaseId } = appwriteConfig;
const SCORE = "score";
const STUDENT_SCORE = "studentScore";

export type Option = { id: number; name: string };
export type Scale = Option & { min: number | null; max: number | null };

export type ScoreHeader = {
  id: number;
  idSection: number;
  /** yyyy-MM-dd (για <input type="date"> και ταξινόμηση) */
  date: string;
  idGradeType: number | null;
  idLesson: number | null;
  idScale: number | null;
  details: string;
};

export type StudentGrade = {
  idStudent: number;
  /** null = χωρίς βαθμό */
  score: number | null;
  owes: boolean;
  notes: string;
  /** «#RRGGBB» ή κενό */
  color: string;
  /** εικονίδιο κελιού (κωδικός MyClass 1–12, βλ. grade-icons.ts) ή null */
  icon: number | null;
};

async function listAll(tableId: string, queries: string[] = []) {
  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId,
    tableId,
    queries: [...queries, Query.limit(5000)],
  });
  return res.rows as unknown as Record<string, unknown>[];
}

async function nextId(tableId: string): Promise<number> {
  const rows = await listAll(tableId, [Query.orderDesc("id"), Query.limit(1)]);
  return ((rows[0]?.id as number | undefined) ?? 0) + 1;
}

/** «dd-MM-yyyy» (MyClass) ↔ «yyyy-MM-dd» */
const toIso = (d: string) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(d ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (d ?? "");
};
const fromIso = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
};

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

export async function listGradeOptions(): Promise<{
  gradeTypes: Option[];
  lessons: Option[];
  scales: Scale[];
}> {
  const [gradeTypes, lessons, scales] = await Promise.all([
    listAll("gradeType", [Query.orderAsc("id")]),
    listAll("lesson", [Query.orderAsc("id")]),
    listAll("scoreType", [Query.orderAsc("id")]),
  ]);
  const opt = (r: Record<string, unknown>) => ({ id: r.id as number, name: String(r.name ?? "") });
  return {
    gradeTypes: gradeTypes.map(opt),
    lessons: lessons.map(opt),
    scales: scales.map((r) => ({ ...opt(r), min: num(r.min), max: num(r.max) })),
  };
}

const toHeader = (r: Record<string, unknown>): ScoreHeader => ({
  id: r.id as number,
  idSection: r.idSection as number,
  date: toIso(String(r.scoreDate ?? "")),
  idGradeType: (r.idGradeType as number | null) ?? null,
  idLesson: (r.idLesson as number | null) ?? null,
  idScale: (r.idScore as number | null) ?? null,
  details: r.Details == null || r.Details === "0" ? "" : String(r.Details),
});

/** Οι βαθμολογίες ενός τμήματος, χρονολογικά. */
export async function listSectionScores(sectionId: number): Promise<ScoreHeader[]> {
  const rows = await listAll(SCORE, [Query.equal("idSection", sectionId)]);
  return rows.map(toHeader).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

export async function getScore(id: number): Promise<ScoreHeader | null> {
  const rows = await listAll(SCORE, [Query.equal("id", id)]);
  return rows[0] ? toHeader(rows[0]) : null;
}

/** Οι βαθμοί ανά βαθμολογία: scoreId → idStudent → βαθμός. */
export async function listGrades(scoreIds: number[]): Promise<Map<number, Map<number, StudentGrade>>> {
  const out = new Map<number, Map<number, StudentGrade>>();
  for (let i = 0; i < scoreIds.length; i += 100) {
    const rows = await listAll(STUDENT_SCORE, [Query.equal("idScore", scoreIds.slice(i, i + 100))]);
    for (const r of rows) {
      const scoreId = r.idScore as number;
      if (!out.has(scoreId)) out.set(scoreId, new Map());
      out.get(scoreId)!.set(r.idStudent as number, {
        idStudent: r.idStudent as number,
        score: num(r.score),
        owes: r.owes === true,
        notes: String(r.notes ?? ""),
        color: String(r.color ?? ""),
        icon: num(r.icon) || null,
      });
    }
  }
  return out;
}

const isEmpty = (g: StudentGrade) =>
  g.score == null && !g.owes && !g.notes.trim() && !g.color && !g.icon;

/**
 * Νέα ή υπάρχουσα βαθμολογία με όλους τους βαθμούς της. Κάθε μαθητής του
 * `grades` γράφεται/ενημερώνεται· όσοι έμειναν κενοί σβήνονται. Επιστρέφει το id.
 */
export async function saveScore(
  header: Omit<ScoreHeader, "id"> & { id: number | null },
  grades: StudentGrade[],
): Promise<number> {
  const { tables } = createAdminClient();
  const data = {
    idSection: header.idSection,
    idGradeType: header.idGradeType,
    idLesson: header.idLesson,
    idScore: header.idScale,
    Details: header.details.trim(),
    scoreDate: fromIso(header.date),
  };

  let id = header.id;
  if (id == null) {
    id = await nextId(SCORE);
    await tables.createRow({ databaseId, tableId: SCORE, rowId: String(id), data: { id, aa: 0, ...data } });
  } else {
    const existing = await listAll(SCORE, [Query.equal("id", id)]);
    if (!existing[0]) throw new Error("Η βαθμολογία δεν βρέθηκε.");
    await tables.updateRow({ databaseId, tableId: SCORE, rowId: existing[0].$id as string, data });
  }

  const current = await listAll(STUDENT_SCORE, [Query.equal("idScore", id)]);
  const rowOf = new Map(current.map((r) => [r.idStudent as number, r]));
  let newId: number | null = null;

  for (const g of grades) {
    const row = rowOf.get(g.idStudent);
    const values = {
      score: g.score,
      owes: g.owes,
      notes: g.notes.trim() || null,
      color: g.color || null,
      icon: g.icon ? String(g.icon) : null,
    };
    if (isEmpty(g)) {
      if (row) await tables.deleteRow({ databaseId, tableId: STUDENT_SCORE, rowId: row.$id as string });
    } else if (row) {
      await tables.updateRow({ databaseId, tableId: STUDENT_SCORE, rowId: row.$id as string, data: values });
    } else {
      newId = newId == null ? await nextId(STUDENT_SCORE) : newId + 1;
      await tables.createRow({
        databaseId,
        tableId: STUDENT_SCORE,
        rowId: String(newId),
        data: { id: newId, idScore: id, idSection: header.idSection, idStudent: g.idStudent, decimals: 0, ...values },
      });
    }
  }
  return id;
}

export async function deleteScore(id: number) {
  const { tables } = createAdminClient();
  const rows = await listAll(STUDENT_SCORE, [Query.equal("idScore", id)]);
  for (const r of rows) {
    await tables.deleteRow({ databaseId, tableId: STUDENT_SCORE, rowId: r.$id as string });
  }
  const score = await listAll(SCORE, [Query.equal("id", id)]);
  if (score[0]) await tables.deleteRow({ databaseId, tableId: SCORE, rowId: score[0].$id as string });
}

// ---------- Τίτλοι, μαθήματα, είδη βαθμού (όπως οι αντίστοιχες οθόνες του MyClass) ----------

export type OptionKind = "gradeType" | "lesson" | "scoreType";

/** Η στήλη του `score` που δείχνει σε κάθε είδος (για τον έλεγχο «χρησιμοποιείται»). */
const USED_BY: Record<OptionKind, string> = {
  gradeType: "idGradeType",
  lesson: "idLesson",
  scoreType: "idScore",
};

async function activeSchoolYear(): Promise<number | null> {
  const rows = await listAll("schoolYear", [Query.equal("is_active", true), Query.limit(1)]);
  return (rows[0]?.id as number | undefined) ?? null;
}

export async function saveOption(
  kind: OptionKind,
  id: number | null,
  values: { name: string; min?: number | null; max?: number | null },
): Promise<number> {
  const { tables } = createAdminClient();
  const data: Record<string, unknown> = { name: values.name.trim() };
  if (kind === "scoreType") {
    data.min = values.min ?? null;
    data.max = values.max ?? null;
  }
  if (id == null) {
    const newId = await nextId(kind);
    if (kind === "lesson") data.idSchoolYear = await activeSchoolYear();
    await tables.createRow({ databaseId, tableId: kind, rowId: String(newId), data: { id: newId, ...data } });
    return newId;
  }
  const rows = await listAll(kind, [Query.equal("id", id)]);
  if (!rows[0]) throw new Error("Δεν βρέθηκε.");
  await tables.updateRow({ databaseId, tableId: kind, rowId: rows[0].$id as string, data });
  return id;
}

/** Πόσες βαθμολογίες χρησιμοποιούν την επιλογή (για να μη σβηστεί κάτι σε χρήση). */
export async function optionUsage(kind: OptionKind, id: number): Promise<number> {
  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId,
    tableId: SCORE,
    queries: [Query.equal(USED_BY[kind], id), Query.limit(1)],
  });
  return res.total;
}

export async function deleteOption(kind: OptionKind, id: number) {
  const { tables } = createAdminClient();
  const rows = await listAll(kind, [Query.equal("id", id)]);
  if (rows[0]) await tables.deleteRow({ databaseId, tableId: kind, rowId: rows[0].$id as string });
}

// ---------- Προβολή μαθητή ----------

export type MyGrade = {
  date: string;
  gradeType: string;
  lesson: string;
  details: string;
  score: number | null;
  max: number | null;
  owes: boolean;
  icon: number | null;
};

/** Οι βαθμοί ενός μαθητή, νεότεροι πρώτοι — με εικονίδιο, χωρίς τα σχόλια/χρώματα του καθηγητή. */
export async function listStudentGrades(idStudent: number): Promise<MyGrade[]> {
  const rows = await listAll(STUDENT_SCORE, [Query.equal("idStudent", idStudent)]);
  const scoreIds = [...new Set(rows.map((r) => r.idScore as number))];
  if (scoreIds.length === 0) return [];

  const [headers, options] = await Promise.all([
    (async () => {
      const out: ScoreHeader[] = [];
      for (let i = 0; i < scoreIds.length; i += 100) {
        out.push(...(await listAll(SCORE, [Query.equal("id", scoreIds.slice(i, i + 100))])).map(toHeader));
      }
      return new Map(out.map((h) => [h.id, h]));
    })(),
    listGradeOptions(),
  ]);
  const name = (list: Option[], id: number | null) => list.find((o) => o.id === id)?.name ?? "";

  return rows
    .flatMap((r) => {
      const h = headers.get(r.idScore as number);
      if (!h) return [];
      const owes = r.owes === true;
      const score = num(r.score);
      const icon = num(r.icon) || null;
      if (!owes && score == null && !icon) return [];
      return [
        {
          date: h.date,
          gradeType: name(options.gradeTypes, h.idGradeType),
          lesson: name(options.lessons, h.idLesson),
          details: h.details,
          score: owes ? null : score,
          max: options.scales.find((s) => s.id === h.idScale)?.max ?? null,
          owes,
          icon,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
