import { submitLessonReport } from "@/app/lesson-actions";

/**
 * Αυτόματη αποθήκευση των απαντήσεων ενός μαθήματος μέσω `navigator.sendBeacon`,
 * όταν ο μαθητής κλείνει ή αφήνει την καρτέλα (οι server actions δεν καλούνται
 * από beacon). Ίδιοι έλεγχοι με το action: μαθητής της συνεδρίας, κόμβος της τάξης του.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ saved: false }, { status: 400 });
  }

  const { idChapter, report } = body;
  if (typeof idChapter !== "string" || typeof report !== "string") {
    return Response.json({ saved: false }, { status: 400 });
  }

  try {
    const result = await submitLessonReport(idChapter, report, false);
    return Response.json(result, { status: result.saved ? 200 : 403 });
  } catch {
    return Response.json({ saved: false }, { status: 403 });
  }
}
