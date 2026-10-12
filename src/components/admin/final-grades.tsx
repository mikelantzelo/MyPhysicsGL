"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon, PrinterIcon } from "lucide-react";

import type { Option } from "@/lib/grades";

const input =
  "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type Student = {
  id: number;
  name: string;
  /** idGradeType → μέσος όρος (κλίμακα 20) */
  averages: Record<number, number>;
};

const fmt = (v: number, digits = 2) => v.toLocaleString("el", { maximumFractionDigits: digits });

/**
 * Υπολογισμός τελικού βαθμού όπως στο MyClass:
 *  1. Y = Σ (ποσοστό κατηγορίας × μέσος όρος κατηγορίας) / 100
 *  2. γραμμική αναγωγή: a = (max − min) / (Ymax − Ymin), b = min − Ymin·a
 *  3. T = στρογγυλοποίηση(a·Y + b)
 * Μαθητής χωρίς βαθμό σε μια επιλεγμένη κατηγορία δεν παίρνει τίποτα από αυτήν
 * (όπως στο MyClass) — σημειώνεται με ⚠.
 */
export function FinalGrades({
  sectionLabel,
  gradeTypes,
  students,
}: {
  sectionLabel: string;
  gradeTypes: Option[];
  students: Student[];
}) {
  const [weights, setWeights] = useState<Record<number, string>>({});
  const [min, setMin] = useState("10");
  const [max, setMax] = useState("20");
  const [scale, setScale] = useState(true);

  const active = gradeTypes.filter((g) => Number(weights[g.id]) > 0);
  const total = active.reduce((s, g) => s + Number(weights[g.id]), 0);
  const desiredMin = Number(min.replace(",", "."));
  const desiredMax = Number(max.replace(",", "."));

  const result = useMemo(() => {
    if (active.length === 0) return { error: "Δώσε ποσοστό σε τουλάχιστον μία κατηγορία.", rows: [] };
    if (total > 100) return { error: "Το σύνολο των ποσοστών δεν πρέπει να ξεπερνά το 100%.", rows: [] };

    const rows = students.map((s) => {
      const y = active.reduce((sum, g) => sum + (Number(weights[g.id]) * (s.averages[g.id] ?? 0)) / 100, 0);
      const missing = active.filter((g) => s.averages[g.id] == null).map((g) => g.name);
      return { ...s, y, missing };
    });

    if (!scale) return { error: null, rows: rows.map((r) => ({ ...r, t: Math.round(r.y) })) };

    if (!(desiredMax > desiredMin)) {
      return { error: "Ο μέγιστος επιθυμητός βαθμός πρέπει να είναι μεγαλύτερος από τον ελάχιστο.", rows: [] };
    }
    const ys = rows.map((r) => r.y);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    if (!(yMax - yMin > 0)) {
      return { error: "Δεν γίνεται αναγωγή: όλοι οι μαθητές έχουν την ίδια βαθμολογία.", rows: [] };
    }
    const a = (desiredMax - desiredMin) / (yMax - yMin);
    const b = desiredMin - yMin * a;
    return { error: null, rows: rows.map((r) => ({ ...r, t: Math.round(a * r.y + b) })) };
  }, [active, total, students, weights, scale, desiredMin, desiredMax]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-xl border bg-card p-3 print:hidden lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Ποσοστό ανά κατηγορία (σύνολο {total}%)</span>
          <div className="flex flex-wrap gap-2">
            {gradeTypes.map((g) => (
              <label key={g.id} className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm">
                {g.name}
                <input
                  className={`${input} h-7 w-16 text-right`}
                  inputMode="numeric"
                  placeholder="0"
                  value={weights[g.id] ?? ""}
                  onChange={(e) => setWeights({ ...weights, [g.id]: e.target.value.replace(/[^\d]/g, "") })}
                  aria-label={`Ποσοστό ${g.name}`}
                />
                %
              </label>
            ))}
            {gradeTypes.length === 0 && (
              <span className="text-sm text-muted-foreground">Δεν υπάρχουν ακόμα βαθμοί στο τμήμα.</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={scale} onChange={(e) => setScale(e.target.checked)} />
            Αναγωγή στο εύρος
          </label>
          <div className="flex items-center gap-2 text-sm">
            <input className={`${input} w-16 text-right`} value={min} onChange={(e) => setMin(e.target.value)} disabled={!scale} aria-label="Ελάχιστος επιθυμητός βαθμός" />
            –
            <input className={`${input} w-16 text-right`} value={max} onChange={(e) => setMax(e.target.value)} disabled={!scale} aria-label="Μέγιστος επιθυμητός βαθμός" />
            <button
              type="button"
              onClick={() => window.print()}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 hover:bg-accent"
            >
              <PrinterIcon className="size-4" />
              Εκτύπωση
            </button>
          </div>
        </div>
      </div>

      {result.error ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          {result.error}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <h3 className="hidden p-3 font-semibold print:block">
            Τελικός βαθμός · {sectionLabel} ·{" "}
            {active.map((g) => `${g.name} ${weights[g.id]}%`).join(", ")}
          </h3>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Μαθητής</th>
                {active.map((g) => (
                  <th key={g.id} className="px-3 py-2 text-right font-medium">
                    {g.name}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium" title="Σ ποσοστό × μέσος όρος">Y</th>
                <th className="px-3 py-2 text-right font-medium">Τελικός</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    {r.name}
                    {r.missing.length > 0 && (
                      <span title={`Χωρίς βαθμό σε: ${r.missing.join(", ")}`} className="ml-1.5 inline-flex align-middle text-amber-500">
                        <AlertTriangleIcon className="size-3.5" />
                      </span>
                    )}
                  </td>
                  {active.map((g) => (
                    <td key={g.id} className="px-3 py-1.5 text-right tabular-nums">
                      {r.averages[g.id] != null ? fmt(r.averages[g.id]) : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(r.y)}</td>
                  <td className="px-3 py-1.5 text-right text-base font-semibold tabular-nums">{r.t}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
