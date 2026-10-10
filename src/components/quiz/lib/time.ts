export function formatApiTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, "0")).join(":");
}
