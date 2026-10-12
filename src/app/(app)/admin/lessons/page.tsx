import { FileCheckIcon, FileTextIcon } from "lucide-react";

import { flattenTree, indented } from "@/components/admin/node-options";
import { NativeSelect } from "@/components/ui/native-select";
import { bestQuizScores, listSectionStudents, listSections } from "@/lib/admin";
import { getNodeTree } from "@/lib/data";
import { listProgress, type ProgressCell } from "@/lib/lessons";
import type { NodeTree } from "@/lib/types";

export const metadata = { title: "Εργασίες · Διαχείριση" };

const dateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("el-GR", {
        timeZone: "Europe/Athens",
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/** Τα φύλλα (παράγραφοι με καρτέλες) κάτω από έναν κόμβο, με τη σειρά του δέντρου. */
function leavesOf(nodes: NodeTree[]): NodeTree[] {
  return nodes.flatMap((n) => (n.children.length ? leavesOf(n.children) : [n]));
}

function findNode(nodes: NodeTree[], id: string): NodeTree | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
}

const isComplete = (c: ProgressCell) => c.total > 0 && c.maxDone >= c.total;

function cellClass(c: ProgressCell) {
  if (isComplete(c)) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (c.maxDone > 0) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

export default async function AdminLessonsPage({ searchParams }: PageProps<"/admin/lessons">) {
  const params = await searchParams;
  const sections = await listSections();

  const sectionId = Number(params.section) || sections.find((s) => s.students > 0)?.id;
  const section = sections.find((s) => s.id === sectionId);
  const nodeId = typeof params.node === "string" && params.node ? params.node : undefined;

  const tree = section?.level ? await getNodeTree(section.level) : [];
  const options = flattenTree(tree);
  const students = section ? await listSectionStudents(section.id) : [];
  const ids = students.map((s) => s.id);
  const [progress, quiz] = await Promise.all([listProgress(ids), bestQuizScores(ids)]);

  const cells = new Map(progress.map((p) => [`${p.idStudent}_${p.idChapter}`, p]));
  const selected = nodeId ? findNode(tree, nodeId) : undefined;
  // Επιλεγμένο κεφάλαιο/παράγραφος → όλα τα φύλλα του· αλλιώς μόνο όσα έχουν δραστηριότητα.
  const touched = new Set([
    ...progress.map((p) => p.idChapter),
    ...[...quiz.keys()].map((k) => k.slice(k.indexOf("_") + 1)),
  ]);
  const columns = selected ? leavesOf([selected]) : leavesOf(tree).filter((n) => touched.has(n.id));

  return (
    <div className="flex flex-col gap-4">
      <form
        method="get"
        className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Τμήμα</span>
          <NativeSelect name="section" defaultValue={section?.id}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.students} μαθητές)
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Κεφάλαιο / παράγραφος</span>
          <NativeSelect name="node" defaultValue={nodeId ?? ""}>
            <option value="">— Όσες έχουν δραστηριότητα —</option>
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

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-emerald-500/30" /> ολοκληρωμένο
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-amber-500/30" /> σε εξέλιξη (βήματα)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-muted-foreground/30" /> άνοιξε μόνο
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileTextIcon className="size-3.5 text-primary" /> απαντήσεις (αυτόματη αποθήκευση)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileCheckIcon className="size-3.5 text-primary" /> … και εκτυπώθηκε
        </span>
        <span>Q = καλύτερο quiz</span>
      </p>

      {!section ? (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν τμήματα.</p>
      ) : students.length === 0 || columns.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          {students.length === 0
            ? `Το ${section.label} δεν έχει μαθητές.`
            : `Δεν υπάρχει ακόμα δραστηριότητα στο ${section.label}${selected ? " σε αυτή την ενότητα" : ""}.`}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Μαθητής</th>
                {columns.map((n) => (
                  <th key={n.id} title={n.title} className="px-1.5 py-2 text-center font-medium">
                    {n.name}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium" title="Ολοκληρωμένα μαθήματα">
                  Ολοκλ.
                </th>
                <th className="px-3 py-2 text-right font-medium" title="Μαθήματα με αποθηκευμένες απαντήσεις">
                  Απαντ.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((s) => {
                let complete = 0;
                let reports = 0;
                return (
                  <tr key={s.id}>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5">
                      {s.name}
                    </td>
                    {columns.map((n) => {
                      const key = `${s.id}_${n.id}`;
                      const c = cells.get(key);
                      const q = quiz.get(key);
                      if (c && isComplete(c)) complete++;
                      if (c?.reportAt) reports++;
                      return (
                        <td key={n.id} className="px-1 py-1 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {c ? (
                              <span
                                title={`Πρώτη φορά ${dateTime(c.firstSeen)} · τελευταία ${dateTime(c.lastSeen)}`}
                                className={`rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${cellClass(c)}`}
                              >
                                {c.total ? `${c.maxDone}/${c.total}` : "✓"}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                            {c?.reportAt && (
                              <a
                                href={`/admin/lessons/report?student=${s.id}&node=${encodeURIComponent(n.id)}`}
                                target="_blank"
                                rel="noopener"
                                title={`Απαντήσεις · τελευταία αποθήκευση ${dateTime(c.reportAt)} · ${c.reports ? `εκτυπώθηκε ${c.reports}×` : "δεν εκτυπώθηκε"}`}
                                className="text-primary hover:text-primary/70"
                              >
                                {c.reports ? (
                                  <FileCheckIcon className="size-4" />
                                ) : (
                                  <FileTextIcon className="size-4" />
                                )}
                              </a>
                            )}
                            {q != null && (
                              <span
                                className={`text-[10px] tabular-nums ${
                                  q >= 70
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : q >= 50
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                Q {q}%
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {complete}/{columns.length}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{reports}</td>
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
