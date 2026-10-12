"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { deleteGradeOption, saveGradeOption } from "@/app/grade-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { Option, OptionKind, Scale } from "@/lib/grades";

const input =
  "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const iconBtn = "inline-flex size-8 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-50";

type Item = Option & { min?: number | null; max?: number | null };
type Draft = { name: string; min: string; max: string };

const toDraft = (i?: Item): Draft => ({
  name: i?.name ?? "",
  min: i?.min != null ? String(i.min) : "",
  max: i?.max != null ? String(i.max) : "",
});
const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

/** Μία λίστα (τίτλοι, είδη βαθμού ή μαθήματα) με προσθήκη, μετονομασία, διαγραφή. */
function OptionList({
  kind,
  title,
  hint,
  items,
  withRange = false,
}: {
  kind: OptionKind;
  title: string;
  hint: string;
  items: Item[];
  withRange?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(toDraft());

  const start = (id: number | "new", item?: Item) => {
    setEditing(id);
    setDraft(toDraft(item));
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveGradeOption(kind, editing === "new" ? null : (editing as number), {
        name: draft.name,
        min: withRange ? numOrNull(draft.min) : undefined,
        max: withRange ? numOrNull(draft.max) : undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setEditing(null);
      router.refresh();
    });

  const remove = async (item: Item) => {
    if (!(await confirm({ title: `Διαγραφή «${item.name}»;`, confirmLabel: "Διαγραφή", destructive: true }))) {
      return;
    }
    startTransition(async () => {
      const result = await deleteGradeOption(kind, item.id);
      if (!result.ok) toast.error(result.message);
      router.refresh();
    });
  };

  const editor = (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        autoFocus
        className={`${input} flex-1`}
        value={draft.name}
        placeholder="Όνομα"
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      {withRange && (
        <>
          <input
            className={`${input} w-16 text-right`}
            inputMode="decimal"
            placeholder="min"
            value={draft.min}
            onChange={(e) => setDraft({ ...draft, min: e.target.value })}
          />
          <span className="text-muted-foreground">–</span>
          <input
            className={`${input} w-16 text-right`}
            inputMode="decimal"
            placeholder="max"
            value={draft.max}
            onChange={(e) => setDraft({ ...draft, max: e.target.value })}
          />
        </>
      )}
      <button type="button" className={iconBtn} onClick={save} disabled={pending} aria-label="Αποθήκευση">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
      </button>
      <button type="button" className={iconBtn} onClick={() => setEditing(null)} aria-label="Άκυρο">
        <XIcon className="size-4" />
      </button>
    </div>
  );

  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => start("new")}
          className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-sm hover:bg-accent"
        >
          <PlusIcon className="size-4" />
          Νέο
        </button>
      </div>
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.id} className="py-1.5">
            {editing === item.id ? (
              editor
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm">
                  {item.name}
                  {withRange && (item.min != null || item.max != null) && (
                    <span className="text-muted-foreground"> ({item.min ?? ""}–{item.max ?? ""})</span>
                  )}
                </span>
                <button type="button" className={iconBtn} onClick={() => start(item.id, item)} aria-label={`Επεξεργασία ${item.name}`}>
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className={`${iconBtn} text-destructive`}
                  onClick={() => remove(item)}
                  disabled={pending}
                  aria-label={`Διαγραφή ${item.name}`}
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
        {editing === "new" && <li className="py-1.5">{editor}</li>}
      </ul>
    </section>
  );
}

export function GradeOptions({
  gradeTypes,
  scales,
  lessons,
}: {
  gradeTypes: Option[];
  scales: Scale[];
  lessons: Option[];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <OptionList kind="gradeType" title="Τίτλοι" hint="Τεστ, Διαγώνισμα, Προφορικά…" items={gradeTypes} />
      <OptionList kind="scoreType" title="Είδη βαθμού" hint="Κλίμακα, π.χ. Αριθμητικό 0–20" items={scales} withRange />
      <OptionList kind="lesson" title="Μαθήματα" hint="Του ενεργού σχολικού έτους" items={lessons} />
    </div>
  );
}
