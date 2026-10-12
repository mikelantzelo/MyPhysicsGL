import { FinalGrades } from "@/components/admin/final-grades";
import { pickSection, SectionPicker } from "@/components/admin/section-picker";
import { listSectionStudents, listSections } from "@/lib/admin";
import { listGradeOptions, listGrades, listSectionScores } from "@/lib/grades";

export const metadata = { title: "Αλγόριθμος · Διαχείριση" };

export default async function FinalGradesPage({ searchParams }: PageProps<"/admin/grades/final">) {
  const params = await searchParams;
  const sections = await listSections();
  const section = pickSection(sections, params.section);

  const [students, scores, options] = section
    ? await Promise.all([listSectionStudents(section.id), listSectionScores(section.id), listGradeOptions()])
    : [[], [], { gradeTypes: [], lessons: [], scales: [] }];
  const grades = await listGrades(scores.map((s) => s.id));
  const maxOf = new Map(options.scales.map((s) => [s.id, s.max]));

  // Μέσος όρος ανά μαθητή και τίτλο, σε κλίμακα 20 (χωρίς απουσίες/κενά).
  const sums = new Map<string, { total: number; n: number }>();
  for (const s of scores) {
    const max = (s.idScale != null ? maxOf.get(s.idScale) : null) ?? 20;
    if (s.idGradeType == null || !max) continue;
    for (const g of grades.get(s.id)?.values() ?? []) {
      if (g.owes || g.score == null) continue;
      const key = `${g.idStudent}_${s.idGradeType}`;
      const cur = sums.get(key) ?? { total: 0, n: 0 };
      sums.set(key, { total: cur.total + (g.score / max) * 20, n: cur.n + 1 });
    }
  }
  const usedTypes = new Set(scores.map((s) => s.idGradeType));

  return (
    <div className="flex flex-col gap-4">
      <SectionPicker sections={sections} selected={section} />
      {section && (
        <FinalGrades
          sectionLabel={section.label}
          gradeTypes={options.gradeTypes.filter((g) => usedTypes.has(g.id))}
          students={students.map((st) => ({
            id: st.id,
            name: st.name,
            averages: Object.fromEntries(
              options.gradeTypes.flatMap((g) => {
                const v = sums.get(`${st.id}_${g.id}`);
                return v ? [[g.id, v.total / v.n]] : [];
              }),
            ),
          }))}
        />
      )}
    </div>
  );
}
