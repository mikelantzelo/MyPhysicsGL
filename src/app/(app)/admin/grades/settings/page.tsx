import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { GradeOptions } from "@/components/admin/grade-options";
import { listGradeOptions } from "@/lib/grades";

export const metadata = { title: "Ρυθμίσεις βαθμολογίας · Διαχείριση" };

export default async function GradeSettingsPage() {
  const options = await listGradeOptions();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link href="/admin/grades" className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-accent" aria-label="Πίσω">
          <ArrowLeftIcon className="size-4" />
        </Link>
        <h2 className="text-lg font-semibold">Ρυθμίσεις βαθμολογίας</h2>
      </div>
      <GradeOptions gradeTypes={options.gradeTypes} scales={options.scales} lessons={options.lessons} />
    </div>
  );
}
