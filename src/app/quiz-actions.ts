"use server";

import { ID, Query } from "node-appwrite";

import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite/server";
import { getUser } from "@/lib/auth";
import { countQuizQuestions, getStudentId } from "@/lib/data";

/**
 * Τα δεδομένα του quiz (πρώην PHP στο 4gymserron.edu.gr) από το Appwrite.
 * Κάθε κλήση ελέγχει ότι ο χρήστης είναι συνδεδεμένος και ότι ο κόμβος ανήκει
 * στην τάξη του· τη βαθμολογία την αποδίδει ο server στον πραγματικό μαθητή.
 */

/** Ο κόμβος, αν υπάρχει και ανήκει στην τάξη του συνδεδεμένου χρήστη. */
async function authorizedNode(idChapter: string) {
  const user = await getUser();
  if (!user?.level) throw new Error("Δεν είσαι συνδεδεμένος.");

  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.tables.nodes,
    queries: [
      Query.equal("$id", idChapter),
      Query.equal("level", user.level),
      Query.limit(1),
    ],
  });
  const node = res.rows[0];
  if (!node) throw new Error("Η παράγραφος δεν βρέθηκε.");
  return { user, node };
}

export async function getQuizInfo(
  idChapter: string,
): Promise<{ title: string; maxQuestions: number }> {
  const { node } = await authorizedNode(idChapter);
  return {
    title: `${node.name} ${node.title}`.trim(),
    maxQuestions: await countQuizQuestions(idChapter),
  };
}

const QUESTION_FIELDS = [
  "idQuestion",
  "idChapter",
  "questionText",
  "imgNumber",
  "questionImage",
  "answerA",
  "answerB",
  "answerC",
  "answerD",
  "answerE",
  "correctAnswer",
  "questionNumber",
] as const;

/** `count` τυχαίες ερωτήσεις του κόμβου (όπως το getQuestionForText.php). */
export async function getQuizQuestions(
  idChapter: string,
  count: number,
): Promise<Record<string, unknown>[]> {
  await authorizedNode(idChapter);

  const { tables } = createAdminClient();
  const res = await tables.listRows({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.tables.question,
    queries: [Query.equal("idChapter", idChapter), Query.limit(500)],
  });

  // Fisher–Yates
  const rows = [...res.rows];
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }

  return rows.slice(0, Math.max(0, count)).map((row) => {
    const r = row as Record<string, unknown>;
    const out: Record<string, unknown> = Object.fromEntries(
      QUESTION_FIELDS.map((k) => [k, r[k] ?? null]),
    );
    // Αν δεν έχει συμπληρωθεί idQuestion, το $id του row είναι μοναδικό.
    out.idQuestion = r.idQuestion ?? r.$id;
    return out;
  });
}

export async function submitQuizResult(payload: {
  idChapter: string;
  score: string;
  timePass: string;
  sumQuestions: number;
  dateOfQuiz: string;
}): Promise<{ success: boolean; message: string }> {
  const { user } = await authorizedNode(payload.idChapter);

  // Ο admin δοκιμάζει τα quiz χωρίς να γράφει βαθμολογίες.
  if (user.isAdmin) {
    return { success: true, message: "Προβολή admin — δεν αποθηκεύτηκε." };
  }

  const idStudent = await getStudentId(user.id);
  if (idStudent == null) {
    return {
      success: false,
      message: "Ο λογαριασμός σου δεν είναι συνδεδεμένος με μαθητή.",
    };
  }

  const { tables } = createAdminClient();
  const { databaseId } = appwriteConfig;
  const tableId = appwriteConfig.tables.result;

  const [previous, last] = await Promise.all([
    tables.listRows({
      databaseId,
      tableId,
      queries: [
        Query.equal("idStudent", idStudent),
        Query.equal("idChapter", payload.idChapter),
        Query.limit(1),
      ],
    }),
    tables.listRows({
      databaseId,
      tableId,
      queries: [Query.orderDesc("id"), Query.limit(1)],
    }),
  ]);

  await tables.createRow({
    databaseId,
    tableId,
    rowId: ID.unique(),
    data: {
      id: ((last.rows[0]?.id as number | undefined) ?? 0) + 1,
      idStudent,
      idChapter: payload.idChapter,
      score: String(payload.score),
      attempt: previous.total + 1,
      timePass: String(payload.timePass),
      sumQuestions: Number(payload.sumQuestions),
      dateOfQuiz: String(payload.dateOfQuiz),
    },
  });

  return { success: true, message: "Αποθηκεύτηκε." };
}
