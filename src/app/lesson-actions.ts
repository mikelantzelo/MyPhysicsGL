"use server";

import { getUser } from "@/lib/auth";
import { getNode, getStudentId } from "@/lib/data";
import { decodeReport, MAX_REPORT_BASE64, recordProgress, saveReport } from "@/lib/lessons";

/**
 * Πρόοδος και αναφορά εκτύπωσης από το μάθημα της καρτέλας «Παρουσίαση»
 * (βλ. src/lib/lessons.ts). Ο μαθητής βγαίνει ΠΑΝΤΑ από τη συνεδρία· από
 * τον browser έρχεται μόνο η παράγραφος, που πρέπει να ανήκει στην τάξη του.
 */

type Result = { saved: boolean; message?: string };

/** Ο μαθητής της συνεδρίας, ή λόγος για τον οποίο δεν αποθηκεύουμε. */
async function lessonStudent(idChapter: string): Promise<number | Result> {
  const user = await getUser();
  if (!user?.level) return { saved: false, message: "Δεν είσαι συνδεδεμένος." };
  // Ο admin βλέπει τα μαθήματα χωρίς να γράφει πρόοδο.
  if (user.isAdmin) return { saved: false, message: "Προβολή admin — δεν αποθηκεύτηκε." };
  if (!(await getNode(idChapter, user.level))) {
    return { saved: false, message: "Η παράγραφος δεν βρέθηκε." };
  }
  const idStudent = await getStudentId(user.id);
  if (idStudent == null) {
    return { saved: false, message: "Ο λογαριασμός σου δεν είναι συνδεδεμένος με μαθητή." };
  }
  return idStudent;
}

export async function reportLessonProgress(
  idChapter: string,
  done: number,
  total: number,
): Promise<Result> {
  if (
    typeof idChapter !== "string" ||
    !Number.isInteger(done) ||
    !Number.isInteger(total) ||
    done < 0 ||
    total < 0 ||
    total > 200 ||
    done > total
  ) {
    return { saved: false };
  }
  const student = await lessonStudent(idChapter);
  if (typeof student !== "number") return student;

  await recordProgress(student, idChapter, done, total);
  return { saved: true };
}

/**
 * `report`: gzip + base64 του { head, body, title } (το συμπιέζει ο browser).
 * `printed`: εκτύπωση από τον μαθητή· αλλιώς αυτόματη αποθήκευση των απαντήσεων.
 */
export async function submitLessonReport(
  idChapter: string,
  report: string,
  printed = true,
): Promise<Result> {
  if (typeof idChapter !== "string" || typeof report !== "string") return { saved: false };
  if (report.length > MAX_REPORT_BASE64) {
    return { saved: false, message: "Η αναφορά είναι πολύ μεγάλη για αποστολή." };
  }
  if (!decodeReport(report)) return { saved: false, message: "Μη έγκυρη αναφορά." };

  const student = await lessonStudent(idChapter);
  if (typeof student !== "number") return student;

  await saveReport(student, idChapter, report, printed === true);
  return { saved: true, message: "Η εργασία σου στάλθηκε στον καθηγητή ✓" };
}
