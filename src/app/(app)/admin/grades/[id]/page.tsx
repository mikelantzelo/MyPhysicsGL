import { notFound } from "next/navigation";

import { GradeEditor } from "@/components/admin/grade-editor";
import { listSectionStudents, listSections } from "@/lib/admin";
import { getScore, listGradeOptions, listGrades } from "@/lib/grades";

export const metadata = { title: "Βαθμολογία · Διαχείριση" };

export default async function EditGradesPage({ params }: PageProps<"/admin/grades/[id]">) {
  const { id } = await params;
  const header = await getScore(Number(id));
  if (!header) notFound();

  const section = (await listSections()).find((s) => s.id === header.idSection);
  if (!section) notFound();

  const [students, options, grades] = await Promise.all([
    listSectionStudents(section.id),
    listGradeOptions(),
    listGrades([header.id]),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Βαθμολογία · {section.label}</h2>
      <GradeEditor
        sectionId={section.id}
        sectionLabel={section.label}
        students={students}
        options={options}
        header={header}
        grades={Object.fromEntries(grades.get(header.id) ?? [])}
      />
    </div>
  );
}
