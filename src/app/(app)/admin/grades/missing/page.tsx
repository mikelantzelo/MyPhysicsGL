import Link from "next/link";

import { pickSection, SectionPicker } from "@/components/admin/section-picker";
import { listSectionStudents, listSections } from "@/lib/admin";
import { listGradeOptions, listGrades, listSectionScores } from "@/lib/grades";

export const metadata = { title: "Χρωστούμενα · Διαχείριση" };

const shortDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}/${Number(m[2])}` : iso;
};

/**
 * Ποιος χρωστάει τι (όπως οι λίστες «οφειλές» του MyClass): για κάθε μαθητή
 * οι βαθμολογίες με «Απουσία» και όσες δεν έχει καθόλου βαθμό. Φίλτρο ανά τίτλο.
 */
export default async function MissingGradesPage({ searchParams }: PageProps<"/admin/grades/missing">) {
  const params = await searchParams;
  const sections = await listSections();
  const section = pickSection(sections, params.section);
  const typeFilter = Number(params.type) || null;

  const [students, allScores, options] = section
    ? await Promise.all([listSectionStudents(section.id), listSectionScores(section.id), listGradeOptions()])
    : [[], [], { gradeTypes: [], lessons: [], scales: [] }];
  const scores = typeFilter ? allScores.filter((s) => s.idGradeType === typeFilter) : allScores;
  const grades = await listGrades(scores.map((s) => s.id));
  const typeName = new Map(options.gradeTypes.map((g) => [g.id, g.name]));
  const usedTypes = options.gradeTypes.filter((g) => allScores.some((s) => s.idGradeType === g.id));

  const rows = students
    .map((st) => {
      const owes = scores.filter((s) => grades.get(s.id)?.get(st.id)?.owes);
      const none = scores.filter((s) => {
        const g = grades.get(s.id)?.get(st.id);
        return !g || (!g.owes && g.score == null);
      });
      return { ...st, owes, none };
    })
    .filter((r) => r.owes.length + r.none.length > 0);

  const chip = (s: (typeof scores)[number], tone: string) => (
    <Link
      key={s.id}
      href={`/admin/grades/${s.id}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs hover:opacity-80 ${tone}`}
    >
      <span className="tabular-nums">{shortDate(s.date)}</span>
      {typeName.get(s.idGradeType ?? -1) ?? "—"}
    </Link>
  );

  const base = section ? `/admin/grades/missing?section=${section.id}` : "/admin/grades/missing";

  return (
    <div className="flex flex-col gap-4">
      <SectionPicker sections={sections} selected={section} />

      {usedTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-sm">
          <Link href={base} className={`rounded-full border px-3 py-1 ${!typeFilter ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}>
            Όλα
          </Link>
          {usedTypes.map((g) => (
            <Link
              key={g.id}
              href={`${base}&type=${g.id}`}
              className={`rounded-full border px-3 py-1 ${typeFilter === g.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}

      {section && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-rose-500/30" /> Απουσία — χρωστάει
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-muted-foreground/30" /> Χωρίς βαθμό
          </span>
        </p>
      )}

      {!section ? (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν τμήματα.</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          {scores.length === 0 ? "Δεν υπάρχουν βαθμολογίες." : "Κανείς δεν χρωστάει βαθμό. 🎉"}
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center">
              <span className="w-56 shrink-0 text-sm">
                {r.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {r.owes.length + r.none.length}
                </span>
              </span>
              <div className="flex flex-wrap gap-1">
                {r.owes.map((s) => chip(s, "bg-rose-500/15 text-rose-700 dark:text-rose-300"))}
                {r.none.map((s) => chip(s, "bg-muted text-muted-foreground"))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
