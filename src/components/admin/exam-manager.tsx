"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, BellOffIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { deleteExamAction, saveExamAction } from "@/app/exam-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { NativeSelect } from "@/components/ui/native-select";
import type { Exam } from "@/lib/exams";

const input =
  "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type Form = {
  rowId: string | null;
  idSection: string;
  examType: string;
  examDate: string;
  details: string;
  remind: boolean;
  remindTime: string;
  notifyStudents: boolean;
};

const athensTime = (iso: string) =>
  new Date(iso).toLocaleString("el-GR", {
    timeZone: "Europe/Athens",
    weekday: "short",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" });

/** Τεστ & διαγωνίσματα: προγραμματισμός με υπενθύμιση την παραμονή (push). */
export function ExamManager({
  sections,
  defaultSection,
  exams,
  examTypes,
  today,
}: {
  sections: { id: number; label: string }[];
  defaultSection: number | null;
  exams: Exam[];
  examTypes: string[];
  today: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const empty: Form = {
    rowId: null,
    idSection: String(defaultSection ?? sections[0]?.id ?? ""),
    examType: examTypes[0] ?? "Τεστ",
    examDate: "",
    details: "",
    remind: true,
    remindTime: "18:00",
    notifyStudents: false,
  };
  const [form, setForm] = useState<Form | null>(null);
  const label = new Map(sections.map((s) => [s.id, s.label]));

  const edit = (e: Exam) =>
    setForm({
      rowId: e.rowId,
      idSection: String(e.idSection),
      examType: e.examType,
      examDate: e.examDate,
      details: e.details,
      remind: e.remindAt != null,
      remindTime: e.remindAt
        ? new Date(e.remindAt).toLocaleTimeString("el-GR", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        : "18:00",
      notifyStudents: e.notifyStudents,
    });

  function save() {
    if (!form) return;
    startTransition(async () => {
      const result = await saveExamAction({
        rowId: form.rowId,
        idSection: Number(form.idSection),
        examType: form.examType,
        examDate: form.examDate,
        details: form.details,
        remindTime: form.remind ? form.remindTime : null,
        notifyStudents: form.notifyStudents,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Αποθηκεύτηκε.");
      setForm(null);
      router.refresh();
    });
  }

  async function remove(e: Exam) {
    if (!(await confirm({ title: `Διαγραφή «${e.examType}» ${dateLabel(e.examDate)};`, confirmLabel: "Διαγραφή", destructive: true }))) return;
    startTransition(async () => {
      await deleteExamAction(e.rowId);
      router.refresh();
    });
  }

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div className="flex flex-col gap-4">
      {form ? (
        <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Τμήμα</span>
            <NativeSelect value={form.idSection} onChange={(e) => set({ idSection: e.target.value })}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Είδος εξέτασης</span>
            <input className={input} list="exam-types" value={form.examType} onChange={(e) => set({ examType: e.target.value })} maxLength={50} />
            <datalist id="exam-types">
              {examTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Ημερομηνία</span>
            <input type="date" className={input} min={form.rowId ? undefined : today} value={form.examDate} onChange={(e) => set({ examDate: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Ύλη / σημείωση</span>
            <input className={input} value={form.details} onChange={(e) => set({ details: e.target.value })} placeholder="π.χ. Κεφ. 1.1–1.3" maxLength={200} />
          </label>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:col-span-2 lg:col-span-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-primary" checked={form.remind} onChange={(e) => set({ remind: e.target.checked })} />
              Υπενθύμιση την παραμονή στις
              <input type="time" className={`${input} w-28`} value={form.remindTime} disabled={!form.remind} onChange={(e) => set({ remindTime: e.target.value })} />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={form.notifyStudents}
                disabled={!form.remind}
                onChange={(e) => set({ notifyStudents: e.target.checked })}
              />
              και στους μαθητές του τμήματος
            </label>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setForm(null)} className="h-9 rounded-lg border px-3 hover:bg-accent">
                Άκυρο
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {pending && <Loader2Icon className="size-4 animate-spin" />}
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm(empty)}
          className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon className="size-4" />
          Νέο τεστ / διαγώνισμα
        </button>
      )}

      {exams.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Δεν υπάρχουν προγραμματισμένα τεστ/διαγωνίσματα.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {exams.map((e) => (
            <li key={e.rowId} className={`flex items-center gap-3 px-3 py-2.5 ${e.examDate < today ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {e.examType} · {label.get(e.idSection) ?? `Τμήμα ${e.idSection}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dateLabel(e.examDate)}
                  {e.details && ` · ${e.details}`}
                </div>
              </div>
              <span
                className="flex items-center gap-1 text-xs text-muted-foreground"
                title={e.remindAt ? `Υπενθύμιση ${athensTime(e.remindAt)}${e.sent ? " (στάλθηκε)" : ""}` : "Χωρίς υπενθύμιση"}
              >
                {e.remindAt ? <BellIcon className={`size-4 ${e.sent ? "" : "text-primary"}`} /> : <BellOffIcon className="size-4" />}
                {e.remindAt && <span className="hidden sm:inline">{athensTime(e.remindAt)}</span>}
                {e.notifyStudents && <UsersIcon className="size-4" aria-label="και στους μαθητές" />}
              </span>
              <button type="button" onClick={() => edit(e)} className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-accent" aria-label="Επεξεργασία">
                <PencilIcon className="size-4" />
              </button>
              <button type="button" onClick={() => remove(e)} disabled={pending} className="inline-flex size-8 items-center justify-center rounded-lg text-destructive hover:bg-accent" aria-label="Διαγραφή">
                <Trash2Icon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
