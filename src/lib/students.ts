import "server-only";

import { randomInt } from "node:crypto";
import { ID, Query } from "node-appwrite";

import { listSections } from "./admin";
import { appwriteConfig } from "./appwrite/config";
import { createAdminClient } from "./appwrite/server";

/** Ίδιο domain με το login (src/app/actions.ts). */
const LOGIN_EMAIL_DOMAIN = "myphysics.local";

export type StudentRow = {
  /** `student.id` */
  id: number;
  rowId: string;
  name: string;
  registrationNumber: string;
  sectionId: number | null;
  loginCode: string | null;
  authUserId: string | null;
  /** null = δεν υπάρχει λογαριασμός */
  enabled: boolean | null;
};

const { databaseId } = appwriteConfig;

async function listAll(tableId: string, queries: string[] = []) {
  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId,
    tableId,
    queries: [...queries, Query.limit(5000)],
  });
  return res.rows as unknown as Record<string, unknown>[];
}

/** Λογαριασμοί Appwrite ανά ID (σε κομμάτια των 100, όριο του query). */
async function usersById(ids: string[]) {
  const { users } = createAdminClient();
  const map = new Map<string, { status: boolean; labels: string[] }>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await users.list({
      queries: [Query.equal("$id", chunk), Query.limit(100)],
    });
    for (const u of res.users) map.set(u.$id, { status: u.status, labels: u.labels ?? [] });
  }
  return map;
}

/** `section`: id τμήματος, "none" (χωρίς τμήμα) ή "all". */
export async function listStudents(
  section: number | "none" | "all",
  search = "",
): Promise<StudentRow[]> {
  const [students, links] = await Promise.all([
    listAll(appwriteConfig.tables.student),
    listAll(appwriteConfig.tables.sectionStudents),
  ]);
  const sectionOf = new Map(links.map((l) => [l.idStudent as number, l.idSection as number]));

  const q = search.trim().toLocaleLowerCase("el");
  const rows = students
    .map((s) => ({
      id: s.id as number,
      rowId: s.$id as string,
      name: `${s.lastName ?? ""} ${s.firstName ?? ""}`.trim(),
      registrationNumber: String(s.registrationNumber ?? ""),
      sectionId: sectionOf.get(s.id as number) ?? null,
      loginCode: (s.loginCode as string | null) || null,
      authUserId: (s.authUserId as string | null) || null,
      enabled: null as boolean | null,
    }))
    .filter((s) =>
      section === "all" ? true : section === "none" ? s.sectionId == null : s.sectionId === section,
    )
    .filter(
      (s) =>
        !q ||
        s.name.toLocaleLowerCase("el").includes(q) ||
        s.registrationNumber.includes(q) ||
        (s.loginCode ?? "").includes(q),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "el"));

  const accounts = await usersById(rows.flatMap((r) => (r.authUserId ? [r.authUserId] : [])));
  for (const r of rows) {
    r.enabled = r.authUserId ? (accounts.get(r.authUserId)?.status ?? null) : null;
  }
  return rows;
}

async function getStudent(studentId: number) {
  const rows = await listAll(appwriteConfig.tables.student, [Query.equal("id", studentId)]);
  const s = rows[0];
  if (!s) throw new Error("Ο μαθητής δεν βρέθηκε.");
  return s;
}

/** Το label τάξης από το τμήμα του μαθητή· κρατά τα υπόλοιπα labels (π.χ. admin). */
async function syncLevelLabel(studentId: number, authUserId: string) {
  const [links, sections] = await Promise.all([
    listAll(appwriteConfig.tables.sectionStudents, [Query.equal("idStudent", studentId)]),
    listSections(),
  ]);
  const level = sections.find((s) => s.id === (links[0]?.idSection as number))?.level;

  const { users } = createAdminClient();
  const user = await users.get({ userId: authUserId });
  const others = (user.labels ?? []).filter((l) => !l.startsWith("level"));
  await users.updateLabels({
    userId: authUserId,
    labels: level ? [...others, `level${level}`] : others,
  });
}

/** Μετακίνηση σε τμήμα (ή αφαίρεση με null) + ενημέρωση label τάξης. */
export async function moveStudent(studentId: number, sectionId: number | null) {
  const { tables } = createAdminClient();
  const tableId = appwriteConfig.tables.sectionStudents;

  const existing = await listAll(tableId, [Query.equal("idStudent", studentId)]);
  for (const l of existing) {
    await tables.deleteRow({ databaseId, tableId, rowId: l.$id as string });
  }
  if (sectionId != null) {
    await tables.createRow({
      databaseId,
      tableId,
      rowId: `${sectionId}_${studentId}`,
      data: { idSection: sectionId, idStudent: studentId },
    });
  }

  const s = await getStudent(studentId);
  if (s.authUserId) await syncLevelLabel(studentId, s.authUserId as string);
}

/** 8 χαρακτήρες, πεζά + αριθμοί, χωρίς αυτούς που μπερδεύονται (0/o, 1/l/i). */
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function randomCode() {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

/**
 * Νέος κωδικός σύνδεσης: ο υπάρχων λογαριασμός μετατρέπεται (email
 * `<κωδικός>@myphysics.local`, password = κωδικός), ώστε να κρατήσει ID,
 * σύνδεση με τον μαθητή και βαθμολογίες. Αν δεν υπάρχει λογαριασμός, φτιάχνεται.
 */
export async function issueLoginCode(studentId: number): Promise<string> {
  const { users, tables } = createAdminClient();
  const s = await getStudent(studentId);
  const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || `Μαθητής ${studentId}`;

  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const taken = await users.list({
      queries: [Query.equal("email", `${code}@${LOGIN_EMAIL_DOMAIN}`), Query.limit(1)],
    });
    if (taken.total === 0) break;
    code = randomCode();
  }
  const email = `${code}@${LOGIN_EMAIL_DOMAIN}`;

  let authUserId = (s.authUserId as string | null) || null;
  if (authUserId) {
    try {
      await users.updateEmail({ userId: authUserId, email });
      await users.updatePassword({ userId: authUserId, password: code });
      await users.updateName({ userId: authUserId, name });
    } catch (e) {
      // Ο συνδεδεμένος λογαριασμός δεν υπάρχει πια → νέος.
      if ((e as { code?: number }).code !== 404) throw e;
      authUserId = null;
    }
  }
  if (!authUserId) {
    const user = await users.create({ userId: ID.unique(), email, password: code, name });
    authUserId = user.$id;
  }

  await tables.updateRow({
    databaseId,
    tableId: appwriteConfig.tables.student,
    rowId: s.$id as string,
    data: { loginCode: code, authUserId },
  });
  await syncLevelLabel(studentId, authUserId);
  return code;
}

async function nextId(tableId: string): Promise<number> {
  const rows = await listAll(tableId, [Query.orderDesc("id"), Query.limit(1)]);
  return ((rows[0]?.id as number | undefined) ?? 0) + 1;
}

/**
 * Ιδιαίτερο τμήμα (εκτός σχολείου), π.χ. «Ιδιαίτερα — Γ΄ Γυμν.». Η τάξη του
 * γράφεται στη στήλη `level`, οπότε μπορεί να είναι και Λυκείου.
 */
export async function createCustomSection(name: string, level: string): Promise<number> {
  const { tables } = createAdminClient();
  const id = await nextId("section");
  await tables.createRow({
    databaseId,
    tableId: "section",
    rowId: String(id),
    data: { id, idClassRoom: null, name: name.trim(), number: "", level },
  });
  return id;
}

/** Νέος μαθητής (π.χ. ιδιαίτερο), προαιρετικά κατευθείαν σε τμήμα. */
export async function createStudent(
  lastName: string,
  firstName: string,
  sectionId: number | null,
): Promise<number> {
  const { tables } = createAdminClient();
  const id = await nextId(appwriteConfig.tables.student);
  await tables.createRow({
    databaseId,
    tableId: appwriteConfig.tables.student,
    rowId: String(id),
    data: {
      id,
      idSchool: null,
      registrationNumber: "",
      lastName: lastName.trim(),
      firstName: firstName.trim(),
    },
  });
  if (sectionId != null) await moveStudent(id, sectionId);
  return id;
}

export async function setStudentEnabled(studentId: number, enabled: boolean) {
  const s = await getStudent(studentId);
  if (!s.authUserId) throw new Error("Ο μαθητής δεν έχει λογαριασμό.");
  const { users } = createAdminClient();
  await users.updateStatus({ userId: s.authUserId as string, status: enabled });
  if (!enabled) {
    // Αποσύνδεση από όλες τις συσκευές.
    await users.deleteSessions({ userId: s.authUserId as string });
  }
}
