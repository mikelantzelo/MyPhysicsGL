// Storage is optional: restricted WebViews and full storage must not crash a quiz.
export function readSession<T>(key: string): T | null {
  try { return JSON.parse(sessionStorage.getItem(key) ?? "null") as T | null; }
  catch { return null; }
}
export function writeSession(key: string, value: unknown): boolean {
  try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function removeSession(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* Storage unavailable. */ }
}
