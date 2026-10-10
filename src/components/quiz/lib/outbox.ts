import { submitResults } from "@/components/quiz/hooks/submitResults";
import type { SubmitDataPayload } from "@/components/quiz/hooks/submitResults";
import { readSession, writeSession } from "./storage";
export interface PendingResult { id: string; payload: SubmitDataPayload; }
const key = "quiz-outbox-v1";
const inFlight = new Map<string, Promise<unknown>>();
const completed = new Set<string>();
export function pendingResults(): PendingResult[] {
  const stored = readSession<PendingResult[]>(key);
  return Array.isArray(stored) ? stored.filter((entry) => entry && typeof entry.id === "string" &&
    entry.payload && Number.isInteger(entry.payload.idStudent) && typeof entry.payload.idChapter === "string") : [];
}
export function rememberResult(entry: PendingResult) {
  if (completed.has(entry.id)) return true;
  return writeSession(key, [...pendingResults().filter((item) => item.id !== entry.id), entry]);
}
export function sendSavedResult(entry: PendingResult): Promise<unknown> {
  if (completed.has(entry.id)) return Promise.resolve();
  const existing = inFlight.get(entry.id);
  if (existing) return existing;
  rememberResult(entry);
  const request = submitResults(entry.payload).then(() => {
    completed.add(entry.id);
    writeSession(key, pendingResults().filter((item) => item.id !== entry.id));
    window.dispatchEvent(new Event("quiz-outbox-change"));
  }).finally(() => inFlight.delete(entry.id));
  inFlight.set(entry.id, request);
  return request;
}
