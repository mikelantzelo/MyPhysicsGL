"use server";

import { revalidatePath } from "next/cache";

import { listSectionStudents, requireAdmin } from "@/lib/admin";
import {
  deleteOption,
  deleteScore,
  listGradeOptions,
  optionUsage,
  saveOption,
  saveScore,
  type OptionKind,
  type StudentGrade,
} from "@/lib/grades";

/** Βαθμολογία τμήματος (βλ. src/lib/grades.ts). Μόνο για τον admin. */

export type SaveGradesInput = {
  id: number | null;
  idSection: number;
  date: string;
  idGradeType: number | null;
  idLesson: number | null;
  idScale: number | null;
  details: string;
  grades: StudentGrade[];
};

export async function saveGrades(
  input: SaveGradesInput,
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  await requireAdmin();

  if (!Number.isInteger(input.idSection)) return { ok: false, message: "Μη έγκυρο τμήμα." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, message: "Διάλεξε ημερομηνία." };
  if (input.idGradeType == null) return { ok: false, message: "Διάλεξε τίτλο (π.χ. Τεστ)." };

  const { scales } = await listGradeOptions();
  const scale = scales.find((s) => s.id === input.idScale);
  const students = new Set((await listSectionStudents(input.idSection)).map((s) => s.id));

  const grades: StudentGrade[] = [];
  for (const g of input.grades) {
    if (!students.has(g.idStudent)) continue;
    const score = g.score == null || Number.isNaN(g.score) ? null : g.score;
    if (score != null && scale) {
      if ((scale.min != null && score < scale.min) || (scale.max != null && score > scale.max)) {
        return {
          ok: false,
          message: `Βαθμός ${score} εκτός κλίμακας ${scale.min ?? ""}–${scale.max ?? ""}.`,
        };
      }
    }
    grades.push({
      idStudent: g.idStudent,
      score: g.owes ? null : score,
      owes: g.owes === true,
      notes: String(g.notes ?? "").slice(0, 1000),
      color: /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : "",
      icon: Number.isInteger(g.icon) && g.icon! >= 1 && g.icon! <= 12 ? g.icon : null,
    });
  }

  const id = await saveScore(
    {
      id: input.id,
      idSection: input.idSection,
      date: input.date,
      idGradeType: input.idGradeType,
      idLesson: input.idLesson,
      idScale: input.idScale,
      details: String(input.details ?? "").slice(0, 200),
    },
    grades,
  );
  revalidatePath("/admin/grades");
  return { ok: true, id };
}

export async function removeGrades(id: number) {
  await requireAdmin();
  if (!Number.isInteger(id)) return;
  await deleteScore(id);
  revalidatePath("/admin/grades");
}

const KINDS = ["gradeType", "lesson", "scoreType"] as const;

export async function saveGradeOption(
  kind: OptionKind,
  id: number | null,
  values: { name: string; min?: number | null; max?: number | null },
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!KINDS.includes(kind)) return { ok: false, message: "Μη έγκυρο είδος." };
  const name = String(values.name ?? "").trim().slice(0, 100);
  if (!name) return { ok: false, message: "Γράψε όνομα." };
  const min = values.min == null || Number.isNaN(values.min) ? null : Number(values.min);
  const max = values.max == null || Number.isNaN(values.max) ? null : Number(values.max);
  if (kind === "scoreType" && min != null && max != null && min >= max) {
    return { ok: false, message: "Το ελάχιστο πρέπει να είναι μικρότερο από το μέγιστο." };
  }
  await saveOption(kind, id, { name, min, max });
  revalidatePath("/admin/grades", "layout");
  return { ok: true };
}

export async function deleteGradeOption(
  kind: OptionKind,
  id: number,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!KINDS.includes(kind) || !Number.isInteger(id)) return { ok: false, message: "Μη έγκυρο." };
  const used = await optionUsage(kind, id);
  if (used > 0) {
    return { ok: false, message: "Χρησιμοποιείται σε βαθμολογίες· δεν μπορεί να διαγραφεί." };
  }
  await deleteOption(kind, id);
  revalidatePath("/admin/grades", "layout");
  return { ok: true };
}
