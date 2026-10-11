import { StudentTable } from "@/components/admin/student-table";
import { StudentTools } from "@/components/admin/student-tools";
import { NativeSelect } from "@/components/ui/native-select";
import { listSections } from "@/lib/admin";
import { listStudents } from "@/lib/students";

export const metadata = { title: "Μαθητές · Διαχείριση" };

export default async function AdminStudentsPage({
  searchParams,
}: PageProps<"/admin/students">) {
  const params = await searchParams;
  const sections = await listSections();

  const raw = typeof params.section === "string" ? params.section : "";
  const section: number | "none" | "all" =
    raw === "none" || raw === "all"
      ? raw
      : sections.some((s) => s.id === Number(raw))
        ? Number(raw)
        : (sections.find((s) => s.students > 0)?.id ?? "all");
  const q = typeof params.q === "string" ? params.q : "";
  const students = await listStudents(section, q);

  return (
    <div className="flex flex-col gap-4">
      <form
        method="get"
        className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Τμήμα</span>
          <NativeSelect
            name="section"
            defaultValue={String(section)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.students})
              </option>
            ))}
            <option value="none">Χωρίς τμήμα</option>
            <option value="all">Όλοι</option>
          </NativeSelect>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Αναζήτηση (όνομα, ΑΜ ή κωδικός)</span>
          <input
            name="q"
            defaultValue={q}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </label>
        <button
          type="submit"
          className="h-8 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Προβολή
        </button>
      </form>

      <p className="-mt-2 text-xs text-muted-foreground">
        {students.length} μαθητές · Η τάξη (label) μπαίνει αυτόματα από το τμήμα.
        Ο κωδικός είναι ταυτόχρονα όνομα χρήστη και password του μαθητή.
      </p>

      <StudentTools
        sections={sections}
        defaultSection={typeof section === "number" ? section : null}
      />

      <StudentTable
        key={`${section}-${q}`}
        students={students}
        sections={sections}
        sectionFilter={String(section)}
      />
    </div>
  );
}
