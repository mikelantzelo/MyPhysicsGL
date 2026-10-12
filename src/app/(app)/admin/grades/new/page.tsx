import { notFound } from "next/navigation";

import { GradeEditor } from "@/components/admin/grade-editor";
import { listSectionStudents, listSections } from "@/lib/admin";
import { listGradeOptions } from "@/lib/grades";

export const metadata = { title: "Νέα βαθμολογία · Διαχείριση" };

export default async function NewGradesPage({ searchParams }: PageProps<"/admin/grades/new">) {
  const params = await searchParams;
  const section = (await listSections()).find((s) => s.id === Number(params.section));
  if (!section) notFound();

  const [students, options] = await Promise.all([listSectionStudents(section.id), listGradeOptions()]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Νέα βαθμολογία · {section.label}</h2>
      <GradeEditor
        sectionId={section.id}
        sectionLabel={section.label}
        students={students}
        options={options}
        header={null}
        grades={{}}
      />
    </div>
  );
}
