"use server";

import { revalidatePath } from "next/cache";

import { listSectionStudents, requireAdmin } from "@/lib/admin";
import { autoSeat, clearSeats, MAX_GRID, moveStudent, setLayout, type SeatPos } from "@/lib/seats";

/** Θέσεις στην τάξη (βλ. src/lib/seats.ts). Μόνο για τον admin. */

async function studentOf(idSection: number, idStudent: number) {
  const students = await listSectionStudents(idSection);
  return students.some((s) => s.id === idStudent);
}

export async function moveSeat(idSection: number, idStudent: number, target: SeatPos | null) {
  await requireAdmin();
  if (!(await studentOf(idSection, idStudent))) return;
  if (
    target &&
    !([target.row, target.col].every((n) => Number.isInteger(n) && n >= 0 && n < MAX_GRID) &&
      (target.slot === 0 || target.slot === 1))
  ) {
    return;
  }
  await moveStudent(idSection, idStudent, target);
  revalidatePath("/admin/grades/seats");
}

export async function resizeSeats(idSection: number, rows: number, cols: number) {
  await requireAdmin();
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_GRID;
  if (!Number.isInteger(idSection) || !ok(rows) || !ok(cols)) return;
  await setLayout(idSection, { rows, cols });
  revalidatePath("/admin/grades/seats");
}

export async function arrangeSeats(idSection: number, mode: "alpha" | "clear") {
  await requireAdmin();
  if (!Number.isInteger(idSection)) return;
  if (mode === "clear") await clearSeats(idSection);
  else await autoSeat(idSection, (await listSectionStudents(idSection)).map((s) => s.id));
  revalidatePath("/admin/grades/seats");
}
