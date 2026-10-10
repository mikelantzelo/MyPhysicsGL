import { submitQuizResult } from "@/app/quiz-actions";

/**
 * Αποθήκευση βαθμολογίας μέσω `navigator.sendBeacon`, όταν ο μαθητής κλείνει
 * ή ανανεώνει τη σελίδα στη μέση του τεστ (οι server actions δεν καλούνται από
 * beacon). Ίδιοι έλεγχοι με το action: συνδεδεμένος χρήστης, κόμβος της τάξης του.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false }, { status: 400 });
  }

  const { idChapter, score, timePass, sumQuestions, dateOfQuiz } = body;
  if (
    typeof idChapter !== "string" ||
    typeof score !== "string" ||
    typeof timePass !== "string" ||
    typeof sumQuestions !== "number" ||
    typeof dateOfQuiz !== "string"
  ) {
    return Response.json({ success: false }, { status: 400 });
  }

  try {
    const result = await submitQuizResult({
      idChapter,
      score,
      timePass,
      sumQuestions,
      dateOfQuiz,
    });
    return Response.json(result, { status: result.success ? 200 : 403 });
  } catch {
    return Response.json({ success: false }, { status: 403 });
  }
}
