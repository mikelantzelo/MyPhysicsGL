import { redirect } from "next/navigation";
import { PencilLineIcon } from "lucide-react";

import { NotificationsToggle } from "@/components/chat/push-ui";
import { getUser } from "@/lib/auth";
import { getStudentId, getStudentSectionIds } from "@/lib/data";
import { listExams, todayInAthens } from "@/lib/exams";

export const metadata = { title: "Εξετάσεις" };

const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" });

/** Τα επερχόμενα τεστ/διαγωνίσματα του τμήματος του μαθητή. */
export default async function ExamsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.isAdmin) redirect("/admin/grades/exams");

  const idStudent = await getStudentId(user.id);
  const sections = idStudent != null ? await getStudentSectionIds(idStudent) : [];
  const today = todayInAthens();
  const exams = sections.length ? await listExams({ sections, from: today }) : [];

  const days = (d: string) =>
    Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <PencilLineIcon className="size-5 text-primary" />
          Τεστ & Διαγωνίσματα
        </h1>
        <NotificationsToggle />
      </div>

      {exams.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Δεν υπάρχει προγραμματισμένο τεστ ή διαγώνισμα.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {exams.map((e) => {
            const n = days(e.examDate);
            return (
              <li key={e.rowId} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{e.examType}</div>
                  <div className="text-sm text-muted-foreground">
                    {dateLabel(e.examDate)}
                    {e.details && ` · ${e.details}`}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    n <= 1 ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-primary/10 text-primary"
                  }`}
                >
                  {n === 0 ? "Σήμερα" : n === 1 ? "Αύριο" : `σε ${n} μέρες`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
