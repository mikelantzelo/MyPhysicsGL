import "server-only";

import { ID, Query } from "node-appwrite";

import { listSections } from "./admin";
import { appwriteConfig } from "./appwrite/config";
import { createAdminClient } from "./appwrite/server";

/**
 * Συνομιλία καθηγητή ↔ μαθητή. Μία συνομιλία ανά μαθητή (κανένα μήνυμα μεταξύ
 * μαθητών). Οι πίνακες έχουν κενά permissions: μόνο ο server διαβάζει/γράφει,
 * και τα actions αποφασίζουν ποιος βλέπει ποια συνομιλία.
 */

export type Sender = "teacher" | "student";

export type ChatMessage = {
  id: string;
  sender: Sender;
  text: string;
  sentTime: string;
};

export type InboxItem = {
  idStudent: number;
  name: string;
  section: string | null;
  lastMessage: string;
  lastMessageTime: string | null;
  /** Μηνύματα του μαθητή που δεν έχει διαβάσει ο καθηγητής. */
  unread: number;
};

export const MAX_MESSAGE_LENGTH = 2000;

const { databaseId } = appwriteConfig;
const MESSAGES = "messages";
const META = "students_chat_meta";

const toMessage = (r: Record<string, unknown>): ChatMessage => ({
  id: r.$id as string,
  sender: r.sender as Sender,
  text: r.text as string,
  sentTime: r.sentTime as string,
});

/**
 * Τα μηνύματα ενός μαθητή σε χρονολογική σειρά. Με `since` μόνο τα νεότερα
 * (για το polling)· αλλιώς τα τελευταία 200.
 */
export async function getThread(idStudent: number, since?: string): Promise<ChatMessage[]> {
  const { tables } = createAdminClient();
  if (since) {
    const res = await tables.listRows({
      databaseId,
      tableId: MESSAGES,
      queries: [
        Query.equal("idStudent", idStudent),
        Query.greaterThan("sentTime", since),
        Query.orderAsc("sentTime"),
        Query.limit(100),
      ],
    });
    return res.rows.map((r) => toMessage(r as Record<string, unknown>));
  }
  const res = await tables.listRows({
    databaseId,
    tableId: MESSAGES,
    queries: [
      Query.equal("idStudent", idStudent),
      Query.orderDesc("sentTime"),
      Query.limit(200),
    ],
  });
  return res.rows.map((r) => toMessage(r as Record<string, unknown>)).reverse();
}

async function getMeta(idStudent: number) {
  const { tables } = createAdminClient();
  try {
    return (await tables.getRow({
      databaseId,
      tableId: META,
      rowId: String(idStudent),
    })) as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Νέο μήνυμα + ενημέρωση μετρητή αδιάβαστων του παραλήπτη και προεπισκόπησης. */
export async function sendMessage(
  idStudent: number,
  sender: Sender,
  rawText: string,
): Promise<ChatMessage> {
  const text = rawText.trim();
  if (!text) throw new Error("Κενό μήνυμα.");
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Το μήνυμα ξεπερνά τους ${MAX_MESSAGE_LENGTH} χαρακτήρες.`);
  }

  const { tables } = createAdminClient();
  const sentTime = new Date().toISOString();
  const row = await tables.createRow({
    databaseId,
    tableId: MESSAGES,
    rowId: ID.unique(),
    data: { idStudent, sender, text, sentTime },
  });

  const meta = await getMeta(idStudent);
  const counter = sender === "teacher" ? "teacher_msg_num" : "student_msg_num";
  await tables.upsertRow({
    databaseId,
    tableId: META,
    rowId: String(idStudent),
    data: {
      idStudent,
      teacher_msg_num: (meta?.teacher_msg_num as number | undefined) ?? 0,
      student_msg_num: (meta?.student_msg_num as number | undefined) ?? 0,
      [counter]: ((meta?.[counter] as number | undefined) ?? 0) + 1,
      lastMessageTime: sentTime,
      lastMessage: text.replace(/\s+/g, " ").slice(0, 200),
    },
  });

  return toMessage(row as unknown as Record<string, unknown>);
}

/** Ο αναγνώστης (`reader`) διάβασε τη συνομιλία → μηδενίζεται ο δικός του μετρητής. */
export async function markRead(idStudent: number, reader: Sender) {
  const meta = await getMeta(idStudent);
  const counter = reader === "student" ? "teacher_msg_num" : "student_msg_num";
  if (!meta || !meta[counter]) return;
  const { tables } = createAdminClient();
  await tables.updateRow({
    databaseId,
    tableId: META,
    rowId: String(idStudent),
    data: { [counter]: 0 },
  });
}

/** Αδιάβαστα μηνύματα του καθηγητή για έναν μαθητή. */
export async function unreadForStudent(idStudent: number): Promise<number> {
  return ((await getMeta(idStudent))?.teacher_msg_num as number | undefined) ?? 0;
}

/** Σύνολο αδιάβαστων μηνυμάτων μαθητών για τον καθηγητή. */
export async function unreadForTeacher(): Promise<number> {
  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId,
    tableId: META,
    queries: [Query.greaterThan("student_msg_num", 0), Query.limit(5000)],
  });
  return res.rows.reduce((sum, r) => sum + ((r.student_msg_num as number) ?? 0), 0);
}

/** Τα εισερχόμενα του καθηγητή: όλες οι συνομιλίες, νεότερη πρώτη. */
export async function listInbox(): Promise<InboxItem[]> {
  const { tables } = createAdminClient();
  const [meta, students, links, sections] = await Promise.all([
    tables.listRows({
      databaseId,
      tableId: META,
      queries: [Query.orderDesc("lastMessageTime"), Query.limit(5000)],
    }),
    tables.listRows({
      databaseId,
      tableId: appwriteConfig.tables.student,
      queries: [Query.limit(5000)],
    }),
    tables.listRows({
      databaseId,
      tableId: appwriteConfig.tables.sectionStudents,
      queries: [Query.limit(5000)],
    }),
    listSections(),
  ]);

  const nameOf = new Map(
    students.rows.map((s) => [s.id as number, `${s.lastName ?? ""} ${s.firstName ?? ""}`.trim()]),
  );
  const sectionLabel = new Map(sections.map((s) => [s.id, s.label]));
  const sectionOf = new Map(
    links.rows.map((l) => [l.idStudent as number, sectionLabel.get(l.idSection as number) ?? null]),
  );

  return meta.rows.map((m) => {
    const idStudent = m.idStudent as number;
    return {
      idStudent,
      name: nameOf.get(idStudent) ?? `#${idStudent}`,
      section: sectionOf.get(idStudent) ?? null,
      lastMessage: (m.lastMessage as string) ?? "",
      lastMessageTime: (m.lastMessageTime as string) ?? null,
      unread: (m.student_msg_num as number) ?? 0,
    };
  });
}

/** Όλοι οι μαθητές με λογαριασμό, για «Νέο μήνυμα» (ομαδοποιημένοι ανά τμήμα). */
export async function listMessageableStudents(): Promise<
  { idStudent: number; name: string; section: string }[]
> {
  const { tables } = createAdminClient();
  const [students, links, sections] = await Promise.all([
    tables.listRows({
      databaseId,
      tableId: appwriteConfig.tables.student,
      queries: [Query.isNotNull("loginCode"), Query.limit(5000)],
    }),
    tables.listRows({
      databaseId,
      tableId: appwriteConfig.tables.sectionStudents,
      queries: [Query.limit(5000)],
    }),
    listSections(),
  ]);
  const sectionLabel = new Map(sections.map((s) => [s.id, s.label]));
  const sectionOf = new Map(
    links.rows.map((l) => [l.idStudent as number, sectionLabel.get(l.idSection as number) ?? ""]),
  );
  return students.rows
    .map((s) => ({
      idStudent: s.id as number,
      name: `${s.lastName ?? ""} ${s.firstName ?? ""}`.trim(),
      section: sectionOf.get(s.id as number) || "Χωρίς τμήμα",
    }))
    .sort(
      (a, b) => a.section.localeCompare(b.section, "el") || a.name.localeCompare(b.name, "el"),
    );
}
