"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, Loader2Icon, SaveIcon, SmilePlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { removeGrades, saveGrades } from "@/app/grade-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GRADE_ICONS, gradeIcon } from "@/lib/grade-icons";
import type { Option, Scale, ScoreHeader, StudentGrade } from "@/lib/grades";

const input =
  "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const primary =
  "inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60";

/** Χρώματα κελιού (όπως το «Χρώμα κελιού» του MyClass). */
const COLORS = [
  { value: "", label: "Χωρίς" },
  { value: "#22c55e", label: "Πράσινο" },
  { value: "#eab308", label: "Κίτρινο" },
  { value: "#f97316", label: "Πορτοκαλί" },
  { value: "#ef4444", label: "Κόκκινο" },
  { value: "#3b82f6", label: "Μπλε" },
];

type Row = {
  idStudent: number;
  name: string;
  score: string;
  owes: boolean;
  notes: string;
  color: string;
  icon: number | null;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Νέα βαθμολογία ή επεξεργασία: ημερομηνία, τίτλος, μάθημα, είδος (κλίμακα),
 * λεπτομέρειες, και από κάτω όλοι οι μαθητές του τμήματος με βαθμό, απουσία,
 * σχόλια και χρώμα κελιού. Enter στον βαθμό → επόμενος μαθητής.
 */
export function GradeEditor({
  sectionId,
  sectionLabel,
  students,
  options,
  header,
  grades,
}: {
  sectionId: number;
  sectionLabel: string;
  students: { id: number; name: string }[];
  options: { gradeTypes: Option[]; lessons: Option[]; scales: Scale[] };
  header: ScoreHeader | null;
  grades: Record<number, StudentGrade>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const [date, setDate] = useState(header?.date ?? today());
  const [idGradeType, setGradeType] = useState(String(header?.idGradeType ?? options.gradeTypes[0]?.id ?? ""));
  const [idLesson, setLesson] = useState(String(header?.idLesson ?? options.lessons[0]?.id ?? ""));
  const [idScale, setScale] = useState(String(header?.idScale ?? options.scales[0]?.id ?? ""));
  const [details, setDetails] = useState(header?.details ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    students.map((s) => {
      const g = grades[s.id];
      return {
        idStudent: s.id,
        name: s.name,
        score: g?.score != null ? String(g.score).replace(".", ",") : "",
        owes: g?.owes ?? false,
        notes: g?.notes ?? "",
        color: g?.color ?? "",
        icon: g?.icon ?? null,
      };
    }),
  );
  const scoreInputs = useRef<(HTMLInputElement | null)[]>([]);

  const scale = options.scales.find((s) => String(s.id) === idScale);
  const range = scale && (scale.min != null || scale.max != null) ? `${scale.min ?? ""}–${scale.max ?? ""}` : "";

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const parse = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));
  const invalid = (r: Row) => {
    const v = parse(r.score);
    if (v == null) return false;
    if (Number.isNaN(v)) return true;
    return (scale?.min != null && v < scale.min) || (scale?.max != null && v > scale.max);
  };

  const filled = rows.filter((r) => r.owes || parse(r.score) != null).length;
  const average = (() => {
    const values = rows.filter((r) => !r.owes && !invalid(r)).map((r) => parse(r.score)).filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  })();

  function save() {
    const bad = rows.find(invalid);
    if (bad) {
      toast.error(`Μη έγκυρος βαθμός για ${bad.name}${range ? ` (κλίμακα ${range})` : ""}.`);
      return;
    }
    startTransition(async () => {
      const result = await saveGrades({
        id: header?.id ?? null,
        idSection: sectionId,
        date,
        idGradeType: idGradeType ? Number(idGradeType) : null,
        idLesson: idLesson ? Number(idLesson) : null,
        idScale: idScale ? Number(idScale) : null,
        details,
        grades: rows.map((r) => ({
          idStudent: r.idStudent,
          score: parse(r.score),
          owes: r.owes,
          notes: r.notes,
          color: r.color,
          icon: r.icon,
        })),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Η βαθμολογία αποθηκεύτηκε.");
      router.push(`/admin/grades?section=${sectionId}`);
      router.refresh();
    });
  }

  async function remove() {
    if (!header) return;
    const ok = await confirm({
      title: "Διαγραφή βαθμολογίας;",
      description: "Θα σβηστούν και όλοι οι βαθμοί των μαθητών της. Δεν αναιρείται.",
      confirmLabel: "Διαγραφή",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await removeGrades(header.id);
      toast.success("Η βαθμολογία διαγράφηκε.");
      router.push(`/admin/grades?section=${sectionId}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Ημερομηνία</span>
          <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Τίτλος</span>
          <NativeSelect value={idGradeType} onChange={(e) => setGradeType(e.target.value)}>
            {options.gradeTypes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Μάθημα</span>
          <NativeSelect value={idLesson} onChange={(e) => setLesson(e.target.value)}>
            {options.lessons.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Είδος βαθμού</span>
          <NativeSelect value={idScale} onChange={(e) => setScale(e.target.value)}>
            {options.scales.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.min != null || o.max != null ? ` (${o.min ?? ""}–${o.max ?? ""})` : ""}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Λεπτομέρειες</span>
          <input
            className={input}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="π.χ. Κεφ. 1, Ύλη 1.1–1.3"
            maxLength={200}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {sectionLabel} · {filled}/{rows.length} με βαθμό ή απουσία
          {average != null && ` · Μ.Ο. ${average.toLocaleString("el", { maximumFractionDigits: 2 })}`}
          {range && ` · κλίμακα ${range}`}
        </span>
        <span className="text-xs">Enter στον βαθμό → επόμενος μαθητής</span>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Μαθητής</th>
              <th className="px-3 py-2 font-medium">Βαθμός</th>
              <th className="px-3 py-2 text-center font-medium">Απουσία</th>
              <th className="px-3 py-2 font-medium">Σχόλια</th>
              <th className="px-3 py-2 font-medium">Χρώμα</th>
              <th className="px-3 py-2 text-center font-medium">Εικονίδιο</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={r.idStudent} className={r.owes ? "bg-muted/40" : undefined}>
                <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="whitespace-nowrap px-3 py-1.5">{r.name}</td>
                <td className="px-3 py-1.5">
                  <input
                    ref={(el) => {
                      scoreInputs.current[i] = el;
                    }}
                    inputMode="decimal"
                    className={`${input} w-20 text-right tabular-nums ${invalid(r) ? "border-destructive text-destructive" : ""}`}
                    value={r.score}
                    disabled={r.owes}
                    onChange={(e) => update(i, { score: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        scoreInputs.current.slice(i + 1).find((el) => el && !el.disabled)?.focus();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    aria-label={`Βαθμός ${r.name}`}
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <Switch
                    checked={r.owes}
                    onCheckedChange={(owes) => update(i, { owes })}
                    aria-label={`Απουσία ${r.name}`}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className={`${input} w-full min-w-40`}
                    value={r.notes}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    maxLength={1000}
                    aria-label={`Σχόλια ${r.name}`}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-1">
                    {COLORS.map((c) => (
                      <button
                        key={c.value || "none"}
                        type="button"
                        title={c.label}
                        aria-label={`${c.label} για ${r.name}`}
                        aria-pressed={r.color === c.value}
                        onClick={() => update(i, { color: c.value })}
                        className={`size-5 rounded-full border ${
                          r.color === c.value ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                        } ${c.value ? "" : "bg-background bg-[linear-gradient(135deg,transparent_45%,currentColor_45%,currentColor_55%,transparent_55%)] text-muted-foreground"}`}
                        style={c.value ? { backgroundColor: c.value } : undefined}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-center">
                  <IconPicker
                    value={r.icon}
                    name={r.name}
                    onChange={(icon) => update(i, { icon })}
                    onApplyAll={(icon) => setRows((rs) => rs.map((x) => ({ ...x, icon })))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {header ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            <Trash2Icon className="size-4" />
            Διαγραφή
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={save} disabled={pending} className={primary}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          Καταχώριση
        </button>
      </div>
    </div>
  );
}

/** Επιλογή εικονιδίου κελιού (όπως το «Επιλέξτε εικονίδιο!» του MyClass), με «Εφαρμογή σε όλους». */
function IconPicker({
  value,
  name,
  onChange,
  onApplyAll,
}: {
  value: number | null;
  name: string;
  onChange: (icon: number | null) => void;
  onApplyAll: (icon: number | null) => void;
}) {
  const current = gradeIcon(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Εικονίδιο ${name}: ${current?.label ?? "κανένα"}`}
        title={current?.label ?? "Χωρίς εικονίδιο"}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-input hover:bg-accent"
      >
        {current ? (
          <current.Icon className={`size-4 ${current.className}`} />
        ) : (
          <SmilePlusIcon className="size-4 text-muted-foreground/60" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="grid grid-cols-4 gap-1 p-1">
          {GRADE_ICONS.map(({ id, label, Icon, className }) => (
            <DropdownMenuItem
              key={id}
              title={label}
              aria-label={label}
              onSelect={() => onChange(id)}
              className={`justify-center p-2 ${value === id ? "bg-accent ring-1 ring-primary" : ""}`}
            >
              <Icon className={`size-5 ${className}`} />
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange(null)}>
          <XIcon className="size-4" />
          Κανένα
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onApplyAll(value)}>
          <CopyIcon className="size-4" />
          Εφαρμογή σε όλους
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
