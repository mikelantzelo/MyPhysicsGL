import type { Question } from "./questions";
import { normalizeQuestions } from "./questions";
import { readSession, removeSession, writeSession } from "./storage";
export interface Attempt {
  attemptId: string; questionCount: number; questions: Question[];
  currentQuestion: number; score: number; timeSpent: number;
  selectedAnswer: string; isSubmitted: boolean;
}
export const attemptKey = (student: number, paragraph: string) => "quiz-attempt-v1:" + student + ":" + paragraph;
export function readAttempt(key: string): Attempt | null {
  const saved = readSession<Attempt>(key);
  if (!saved || typeof saved.attemptId !== "string" || !Number.isInteger(saved.questionCount) ||
    saved.questionCount < 1 || !Number.isInteger(saved.currentQuestion) || saved.currentQuestion < 1 ||
    saved.currentQuestion > saved.questionCount || !Number.isInteger(saved.score) || saved.score < 0 ||
    typeof saved.selectedAnswer !== "string" || typeof saved.isSubmitted !== "boolean" ||
    saved.score > saved.currentQuestion - (saved.isSubmitted ? 0 : 1) ||
    !Number.isFinite(saved.timeSpent) || saved.timeSpent < 0) return null;
  try { return { ...saved, questions: normalizeQuestions(saved.questions, saved.questionCount) }; }
  catch { removeSession(key); return null; }
}
export function setAttemptOwner(student: number, paragraph: string) {
  writeSession("quiz-attempt-owner", { student, paragraph });
}
export function currentAttemptKey(paragraph: string): string | null {
  const owner = readSession<{ student: number; paragraph: string }>("quiz-attempt-owner");
  return owner && owner.paragraph === paragraph && Number.isInteger(owner.student) ? attemptKey(owner.student, paragraph) : null;
}
