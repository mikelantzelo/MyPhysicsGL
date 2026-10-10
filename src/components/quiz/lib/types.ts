// Define the quiz results type
export interface QuizResults {
  attemptId?: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  timeSpentFormatted: string, // Add formatted time
}

export type ScreenState = "start" | "quiz" | "results";
