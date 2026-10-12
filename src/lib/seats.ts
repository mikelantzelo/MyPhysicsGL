import "server-only";

import { AppwriteException, Query } from "node-appwrite";

import { appwriteConfig } from "./appwrite/config";
import { createAdminClient } from "./appwrite/server";

/**
 * Θέσεις στην τάξη (όπως οι «Θέσεις» του MyClass): πλέγμα θρανίων
 * γραμμές × στήλες ανά τμήμα, 2 θέσεις ανά θρανίο (slot 0 αριστερά, 1 δεξιά).
 */

const { databaseId } = appwriteConfig;
const LAYOUT = "seat_layout";
const SEAT = "seat";

export type Layout = { rows: number; cols: number };
export type SeatPos = { row: number; col: number; slot: number };
export type Seat = SeatPos & { idStudent: number };

export const DEFAULT_LAYOUT: Layout = { rows: 5, cols: 3 };
export const MAX_GRID = 12;

const seatRowId = (idSection: number, idStudent: number) => `${idSection}_${idStudent}`;

export async function getLayout(idSection: number): Promise<Layout> {
  const { tables } = createAdminClient();
  try {
    const r = await tables.getRow({ databaseId, tableId: LAYOUT, rowId: String(idSection) });
    return { rows: r.rows as number, cols: r.cols as number };
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) return DEFAULT_LAYOUT;
    throw e;
  }
}

export async function listSeats(idSection: number): Promise<Seat[]> {
  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId,
    tableId: SEAT,
    queries: [Query.equal("idSection", idSection), Query.limit(500)],
  });
  return (res.rows as unknown as Record<string, number>[]).map((r) => ({
    idStudent: r.idStudent,
    row: r.row,
    col: r.col,
    slot: r.slot,
  }));
}

/** Νέο μέγεθος πλέγματος· όσοι μένουν εκτός ξανασηκώνονται (χωρίς θέση). */
export async function setLayout(idSection: number, layout: Layout) {
  const { tables } = createAdminClient();
  await tables.upsertRow({
    databaseId,
    tableId: LAYOUT,
    rowId: String(idSection),
    data: { idSection, ...layout },
  });
  for (const s of await listSeats(idSection)) {
    if (s.row >= layout.rows || s.col >= layout.cols) {
      await tables.deleteRow({ databaseId, tableId: SEAT, rowId: seatRowId(idSection, s.idStudent) });
    }
  }
}

async function put(idSection: number, idStudent: number, pos: SeatPos | null) {
  const { tables } = createAdminClient();
  const rowId = seatRowId(idSection, idStudent);
  if (pos) {
    await tables.upsertRow({ databaseId, tableId: SEAT, rowId, data: { idSection, idStudent, ...pos } });
  } else {
    try {
      await tables.deleteRow({ databaseId, tableId: SEAT, rowId });
    } catch (e) {
      if (!(e instanceof AppwriteException && e.code === 404)) throw e;
    }
  }
}

/**
 * Ο μαθητής πηγαίνει στη θέση `target` (ή σηκώνεται, με null). Αν η θέση είναι
 * πιασμένη, ο άλλος μαθητής παίρνει την παλιά θέση του πρώτου (ανταλλαγή).
 */
export async function moveStudent(idSection: number, idStudent: number, target: SeatPos | null) {
  const seats = await listSeats(idSection);
  const from = seats.find((s) => s.idStudent === idStudent) ?? null;
  const other = target
    ? seats.find((s) => s.row === target.row && s.col === target.col && s.slot === target.slot)
    : undefined;

  if (other && other.idStudent !== idStudent) {
    await put(idSection, other.idStudent, from ? { row: from.row, col: from.col, slot: from.slot } : null);
  }
  await put(idSection, idStudent, target);
}

/** Όλοι χωρίς θέση. */
export async function clearSeats(idSection: number) {
  for (const s of await listSeats(idSection)) await put(idSection, s.idStudent, null);
}

/** Αυτόματη τοποθέτηση με τη σειρά της λίστας (αλφαβητικά), μπροστά προς τα πίσω. */
export async function autoSeat(idSection: number, idStudents: number[]) {
  const layout = await getLayout(idSection);
  await clearSeats(idSection);
  let i = 0;
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      for (let slot = 0; slot < 2; slot++) {
        if (i >= idStudents.length) return;
        await put(idSection, idStudents[i++], { row, col, slot });
      }
    }
  }
}
