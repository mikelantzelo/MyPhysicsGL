import Link from "next/link";

import { ExamManager } from "@/components/admin/exam-manager";
import { listSections } from "@/lib/admin";
import { listExams, todayInAthens } from "@/lib/exams";
import { listGradeOptions } from "@/lib/grades";

export const metadata = { title: "Προγραμματισμός · Διαχείριση" };

/** Όλα τα επερχόμενα τεστ/διαγωνίσματα (ή και τα παλιά, με ?past=1). */
export default async function ExamsAdminPage({ searchParams }: PageProps<"/admin/grades/exams">) {
  const params = await searchParams;
  const past = params.past === "1";
  const today = todayInAthens();
  const [sections, exams, options] = await Promise.all([
    listSections(),
    listExams(past ? {} : { from: today }),
    listGradeOptions(),
  ]);
  const section = Number(params.section) || null;

  const base = `/admin/grades/exams${section ? `?section=${section}&` : "?"}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 text-sm">
        <Link href={`${base}`.replace(/[?&]$/, "")} className={`rounded-full border px-3 py-1 ${!past ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}>
          Επερχόμενα
        </Link>
        <Link href={`${base}past=1`} className={`rounded-full border px-3 py-1 ${past ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}>
          Όλα
        </Link>
      </div>
      <ExamManager
        sections={sections}
        defaultSection={section}
        exams={past ? [...exams].reverse() : exams}
        examTypes={[...new Set(["Τεστ", "Διαγώνισμα", ...options.gradeTypes.map((g) => g.name)])]}
        today={today}
      />
    </div>
  );
}
