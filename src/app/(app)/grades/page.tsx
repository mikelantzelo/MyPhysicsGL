import { redirect } from "next/navigation";
import { StarIcon } from "lucide-react";

import { getUser } from "@/lib/auth";
import { getStudentId } from "@/lib/data";
import { gradeIcon } from "@/lib/grade-icons";
import { listStudentGrades } from "@/lib/grades";

export const metadata = { title: "Οι βαθμοί μου" };

const dateLabel = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" })
    : iso;

const fmt = (v: number) => v.toLocaleString("el", { maximumFractionDigits: 2 });

/** Οι βαθμοί του μαθητή (από τη Βαθμολογία τμήματος του καθηγητή). */
export default async function MyGradesPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.isAdmin) redirect("/admin/grades");

  const idStudent = await getStudentId(user.id);
  if (idStudent == null) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-muted-foreground">
        Ο λογαριασμός σου δεν είναι συνδεδεμένος με μαθητή. Μίλησε με τον καθηγητή σου.
      </div>
    );
  }

  const grades = await listStudentGrades(idStudent);

  // Μέσος όρος ανά τίτλο, σε κλίμακα 20.
  const byType = new Map<string, number[]>();
  for (const g of grades) {
    if (g.score == null || !g.max) continue;
    byType.set(g.gradeType, [...(byType.get(g.gradeType) ?? []), (g.score / g.max) * 20]);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
        <StarIcon className="size-5 text-primary" />
        Οι βαθμοί μου
      </h1>

      {grades.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Δεν υπάρχουν ακόμα βαθμοί.
        </div>
      ) : (
        <>
          {byType.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {[...byType].map(([type, values]) => (
                <div key={type} className="rounded-xl border bg-card px-4 py-2">
                  <div className="text-xs text-muted-foreground">{type || "Βαθμοί"} · Μ.Ο.</div>
                  <div className="text-xl font-semibold tabular-nums">
                    {fmt(values.reduce((a, b) => a + b, 0) / values.length)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <ul className="divide-y rounded-xl border bg-card">
            {grades.map((g, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {g.gradeType}
                    {g.lesson && <span className="font-normal text-muted-foreground"> · {g.lesson}</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {dateLabel(g.date)}
                    {g.details && ` · ${g.details}`}
                  </div>
                </div>
                {(() => {
                  const icon = gradeIcon(g.icon);
                  return icon ? (
                    <span title={icon.label} className="shrink-0">
                      <icon.Icon aria-label={icon.label} className={`size-5 ${icon.className}`} />
                    </span>
                  ) : null;
                })()}
                {g.owes ? (
                  <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                    Απουσία — χρωστάς
                  </span>
                ) : g.score == null ? null : (
                  <span className="text-lg font-semibold tabular-nums">
                    {fmt(g.score)}
                    {g.max != null && <span className="text-sm font-normal text-muted-foreground">/{fmt(g.max)}</span>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
