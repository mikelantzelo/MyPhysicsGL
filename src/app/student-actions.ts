"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import {
  createCustomSection,
  createStudent,
  issueLoginCode,
  listStudents,
  moveStudent,
  setStudentEnabled,
} from "@/lib/students";
import { LEVELS, type Level } from "@/lib/types";

/** Διαχείριση μαθητών — μόνο admin. */

export async function changeStudentSection(studentId: number, sectionId: number | null) {
  await requireAdmin();
  await moveStudent(studentId, sectionId);
  revalidatePath("/admin/students");
}

/**
 * Κωδικοί για πολλούς μαθητές. Ο client στέλνει μικρά κομμάτια (π.χ. 5)
 * ώστε κάθε κλήση να τελειώνει γρήγορα (όριο χρόνου στο Vercel).
 */
export async function issueLoginCodes(
  studentIds: number[],
): Promise<{ id: number; code?: string; error?: string }[]> {
  await requireAdmin();
  // Παράλληλα μέσα στο κομμάτι: ~5× πιο γρήγορα για ολόκληρο το σχολείο.
  const out = await Promise.all(
    studentIds.slice(0, 10).map(async (id) => {
      try {
        return { id, code: await issueLoginCode(id) };
      } catch (e) {
        return { id, error: e instanceof Error ? e.message : "Σφάλμα" };
      }
    }),
  );
  revalidatePath("/admin/students");
  return out;
}

/** Όλοι οι μαθητές (κάθε τμήματος) χωρίς κωδικό, για το «Δημιουργία όλων». */
export async function studentsWithoutCode(): Promise<{
  ids: number[];
  withoutSection: number;
}> {
  await requireAdmin();
  const missing = (await listStudents("all")).filter((s) => !s.loginCode);
  return {
    ids: missing.map((s) => s.id),
    withoutSection: missing.filter((s) => s.sectionId == null).length,
  };
}

export async function changeStudentEnabled(studentId: number, enabled: boolean) {
  await requireAdmin();
  await setStudentEnabled(studentId, enabled);
  revalidatePath("/admin/students");
}

export async function addCustomSection(
  name: string,
  level: Level,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!name.trim()) return { ok: false, error: "Γράψε όνομα τμήματος." };
  if (!LEVELS.includes(level)) return { ok: false, error: "Διάλεξε τάξη." };
  const id = await createCustomSection(name, level);
  revalidatePath("/admin", "layout");
  return { ok: true, id };
}

export async function addStudent(
  lastName: string,
  firstName: string,
  sectionId: number | null,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (!lastName.trim() || !firstName.trim()) {
    return { ok: false, error: "Γράψε επώνυμο και όνομα." };
  }
  const id = await createStudent(lastName, firstName, sectionId);
  revalidatePath("/admin", "layout");
  return { ok: true, id };
}
