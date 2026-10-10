export function soundEnabled(): boolean {
  try { return localStorage.getItem("quiz-sound") !== "off"; }
  catch { return true; }
}
