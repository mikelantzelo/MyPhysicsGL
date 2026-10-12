import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { pickSection, SectionPicker } from "@/components/admin/section-picker";
import { listSectionStudents, listSections } from "@/lib/admin";
import { gradeIcon } from "@/lib/grade-icons";
import { listGradeOptions, listGrades, listSectionScores } from "@/lib/grades";

export const metadata = { title: "Βαθμολογία · Διαχείριση" };

const shortDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}/${Number(m[2])}` : iso;
};

/**
 * Βαθμολόγιο τμήματος (όπως στο MyClass): μαθητές × βαθμολογίες. Κάθε στήλη
 * ανοίγει την καταχώριση βαθμών της· «Νέα βαθμολογία» για ημερομηνία, τίτλο κ.λπ.
 */
export default async function AdminGradesPage({ searchParams }: PageProps<"/admin/grades">) {
  const params = await searchParams;
  const sections = await listSections();
  const section = pickSection(sections, params.section);

  const [students, scores, options] = section
    ? await Promise.all([
        listSectionStudents(section.id),
        listSectionScores(section.id),
        listGradeOptions(),
      ])
    : [[], [], null];
  const grades = await listGrades(scores.map((s) => s.id));

  const gradeTypeName = new Map(options?.gradeTypes.map((o) => [o.id, o.name]));
  const lessonName = new Map(options?.lessons.map((o) => [o.id, o.name]));
  const scaleOf = new Map(options?.scales.map((o) => [o.id, o]));

  /** Μ.Ο. του μαθητή σε κλίμακα 20 (όσοι βαθμοί έχουν κλίμακα με μέγιστο). */
  const averageOf = (idStudent: number) => {
    const values: number[] = [];
    for (const s of scores) {
      const g = grades.get(s.id)?.get(idStudent);
      const max = s.idScale != null ? scaleOf.get(s.idScale)?.max : null;
      if (g?.score != null && !g.owes && max) values.push((g.score / max) * 20);
    }
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SectionPicker sections={sections} selected={section}>
        {section && (
          <Link
            href={`/admin/grades/new?section=${section.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="size-4" />
            Νέα βαθμολογία
          </Link>
        )}
      </SectionPicker>

      {!section ? (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν τμήματα.</p>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Το {section.label} δεν έχει μαθητές.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium shadow-[1px_0_0_var(--border)]">Μαθητής</th>
                {scores.map((s) => (
                  <th key={s.id} className="px-1 py-1 text-center font-medium">
                    <Link
                      href={`/admin/grades/${s.id}`}
                      title={[
                        gradeTypeName.get(s.idGradeType ?? -1),
                        lessonName.get(s.idLesson ?? -1),
                        s.details,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      className="flex flex-col items-center rounded-md px-1.5 py-1 hover:bg-accent hover:text-foreground"
                    >
                      <span className="tabular-nums">{shortDate(s.date)}</span>
                      <span className="max-w-20 truncate font-normal">
                        {gradeTypeName.get(s.idGradeType ?? -1) ?? "—"}
                      </span>
                    </Link>
                  </th>
                ))}
                <th className="sticky right-0 z-10 bg-card px-3 py-2 text-right font-medium shadow-[-1px_0_0_var(--border)]" title="Μέσος όρος σε κλίμακα 20">
                  Μ.Ο.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((st) => {
                const avg = averageOf(st.id);
                return (
                  <tr key={st.id}>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5 shadow-[1px_0_0_var(--border)]">{st.name}</td>
                    {scores.map((s) => {
                      const g = grades.get(s.id)?.get(st.id);
                      const icon = gradeIcon(g?.icon);
                      return (
                        <td key={s.id} className="px-1 py-1 text-center">
                          {g ? (
                            <span
                              title={g.notes || undefined}
                              className={`inline-flex min-w-9 items-center justify-center gap-0.5 rounded px-1.5 py-0.5 tabular-nums ${
                                g.notes ? "underline decoration-dotted underline-offset-2" : ""
                              }`}
                              style={g.color ? { backgroundColor: `${g.color}33`, boxShadow: `inset 0 0 0 1px ${g.color}` } : undefined}
                            >
                              {g.owes
                                ? "Απ."
                                : g.score != null
                                  ? g.score.toLocaleString("el", { maximumFractionDigits: 2 })
                                  : icon
                                    ? null
                                    : "·"}
                              {icon && (
                                <icon.Icon aria-label={icon.label} className={`size-3.5 shrink-0 ${icon.className}`} />
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-card px-3 py-1.5 text-right font-medium tabular-nums shadow-[-1px_0_0_var(--border)]">
                      {avg != null ? avg.toLocaleString("el", { maximumFractionDigits: 1 }) : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {scores.length === 0 && (
            <p className="border-t p-4 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν ακόμα βαθμολογίες. Πάτα «Νέα βαθμολογία».
            </p>
          )}
        </div>
      )}
    </div>
  );
}
