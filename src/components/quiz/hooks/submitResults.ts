import { submitQuizResult } from "@/app/quiz-actions";

export interface SubmitDataPayload {
  /** Μόνο για το κλειδί του outbox· ο server βρίσκει μόνος του τον μαθητή. */
  idStudent: number;
  idChapter: string;
  score: string;
  timePass: string;
  sumQuestions: number;
  dateOfQuiz: string;
}

export interface SubmitDataResponse {
  success: boolean;
  message: string;
}

export const submitResults = async (
  data: SubmitDataPayload,
): Promise<SubmitDataResponse> => {
  try {
    const { idStudent: _ignored, ...payload } = data;
    void _ignored;
    const response = await submitQuizResult(payload);
    if (!response || response.success !== true) {
      throw new Error(
        response?.message || "Ο διακομιστής δεν επιβεβαίωσε την αποθήκευση.",
      );
    }
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Δεν μπόρεσα να στείλω τα αποτελέσματα.",
    );
  }
};
