"use server";

import { revalidatePath } from "next/cache";

import { listSections, requireAdmin } from "@/lib/admin";
import { athensToUtc, dayBefore, deleteExam, saveExam } from "@/lib/exams";

/** Τεστ & διαγωνίσματα (βλ. src/lib/exams.ts). Μόνο για τον admin. */

export type ExamInput = {
  rowId: string | null;
  idSection: number;
  examType: string;
  examDate: string;
  details: string;
  /** «HH:MM» την παραμονή, ή null για χωρίς υπενθύμιση */
  remindTime: string | null;
  notifyStudents: boolean;
};

export async function saveExamAction(input: ExamInput): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  if (!(await listSections()).some((s) => s.id === input.idSection)) {
    return { ok: false, message: "Διάλεξε τμήμα." };
  }
  const examType = String(input.examType ?? "").trim().slice(0, 50);
  if (!examType) return { ok: false, message: "Γράψε είδος (π.χ. Τεστ)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.examDate)) return { ok: false, message: "Διάλεξε ημερομηνία." };

  let remindAt: string | null = null;
  if (input.remindTime) {
    const m = /^(\d{2}):(\d{2})$/.exec(input.remindTime);
    if (!m || +m[1] > 23 || +m[2] > 59) return { ok: false, message: "Μη έγκυρη ώρα υπενθύμισης." };
    remindAt = athensToUtc(dayBefore(input.examDate), +m[1], +m[2]);
  }

  await saveExam(input.rowId, {
    idSection: input.idSection,
    examType,
    examDate: input.examDate,
    details: String(input.details ?? "").trim().slice(0, 200),
    remindAt,
    notifyStudents: input.notifyStudents === true,
  });
  revalidatePath("/admin/grades/exams");
  revalidatePath("/exams");
  return { ok: true };
}

export async function deleteExamAction(rowId: string) {
  await requireAdmin();
  if (typeof rowId !== "string" || !rowId) return;
  await deleteExam(rowId);
  revalidatePath("/admin/grades/exams");
  revalidatePath("/exams");
}
