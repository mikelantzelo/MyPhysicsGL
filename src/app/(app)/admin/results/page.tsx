import { flattenTree, indented } from "@/components/admin/node-options";
import { NativeSelect } from "@/components/ui/native-select";
import { getSectionResults, listSections } from "@/lib/admin";
import { getNodeTree } from "@/lib/data";

export const metadata = { title: "Αποτελέσματα quiz · Διαχείριση" };

const pct = (score: number, total: number) =>
  total > 0 ? Math.round((score / total) * 100) : 0;

export default async function AdminResultsPage({
  searchParams,
}: PageProps<"/admin/results">) {
  const params = await searchParams;
  const sections = await listSections();

  const sectionId = Number(params.section) || sections.find((s) => s.students > 0)?.id;
  const section = sections.find((s) => s.id === sectionId);
  const nodeId = typeof params.node === "string" && params.node ? params.node : undefined;

  const options = section?.level ? flattenTree(await getNodeTree(section.level)) : [];
  const labelOf = new Map(options.map((o) => [o.id, o.label]));
  const results = section ? await getSectionResults(section.id, nodeId) : [];

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Τμήμα</span>
          <NativeSelect
            name="section"
            defaultValue={section?.id}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.students} μαθητές)
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Παράγραφος</span>
          <NativeSelect
            name="node"
            defaultValue={nodeId ?? ""}
          >
            <option value="">— Όλες —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {indented(o)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <button
          type="submit"
          className="h-8 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Προβολή
        </button>
      </form>

      {!section ? (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν τμήματα.</p>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Δεν υπάρχουν ακόμα αποτελέσματα για το {section.label}
          {nodeId ? " σε αυτή την παράγραφο" : ""}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Μαθητής</th>
                <th className="px-3 py-2 font-medium">Παράγραφος</th>
                <th className="px-3 py-2 text-right font-medium">Σωστές</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
                <th className="px-3 py-2 text-right font-medium">Προσπ.</th>
                <th className="px-3 py-2 text-right font-medium">Χρόνος</th>
                <th className="px-3 py-2 text-right font-medium">Ημερομηνία</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map((r) => {
                const p = pct(r.score, r.sumQuestions);
                return (
                  <tr key={r.rowId}>
                    <td className="whitespace-nowrap px-3 py-2">{r.student}</td>
                    <td className="max-w-64 truncate px-3 py-2 text-muted-foreground">
                      {labelOf.get(r.idChapter) ?? r.idChapter}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.score.toLocaleString("el", { maximumFractionDigits: 2 })} / {r.sumQuestions}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium tabular-nums ${
                        p >= 70
                          ? "text-emerald-600 dark:text-emerald-400"
                          : p >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {p}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.attempt}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.timePass}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {r.dateOfQuiz}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
