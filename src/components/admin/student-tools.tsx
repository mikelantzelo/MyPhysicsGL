"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlusIcon, Loader2Icon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { addCustomSection, addStudent } from "@/app/student-actions";
import { NativeSelect } from "@/components/ui/native-select";
import type { Section } from "@/lib/admin";
import { LEVEL_LABELS, LEVELS, type Level } from "@/lib/types";

const input =
  "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const primary =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60";

/** «Νέο ιδιαίτερο τμήμα» και «Νέος μαθητής» για όσους δεν είναι στο σχολείο. */
export function StudentTools({
  sections,
  defaultSection,
}: {
  sections: Section[];
  defaultSection: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"section" | "student" | null>(null);
  const [pending, startTransition] = useTransition();

  const [sectionName, setSectionName] = useState("");
  const [level, setLevel] = useState<Level>("GC");

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [studentSection, setStudentSection] = useState<string>(
    defaultSection != null ? String(defaultSection) : "",
  );

  const toggle = (which: "section" | "student") => setOpen((o) => (o === which ? null : which));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toggle("section")}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted"
        >
          <FolderPlusIcon className="size-4" />
          Νέο ιδιαίτερο τμήμα
        </button>
        <button
          type="button"
          onClick={() => toggle("student")}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted"
        >
          <UserPlusIcon className="size-4" />
          Νέος μαθητής
        </button>
      </div>

      {open === "section" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await addCustomSection(sectionName, level);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(`Δημιουργήθηκε το τμήμα «${sectionName.trim()}».`);
              setSectionName("");
              setOpen(null);
              router.push(`/admin/students?section=${res.id}`);
            });
          }}
          className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Όνομα τμήματος</span>
            <input
              required
              autoFocus
              placeholder="π.χ. Ιδιαίτερα — Γ΄ Γυμνασίου"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Τάξη</span>
            <NativeSelect value={level} onChange={(e) => setLevel(e.target.value as Level)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <button type="submit" disabled={pending} className={primary}>
            {pending && <Loader2Icon className="size-4 animate-spin" />}
            Δημιουργία
          </button>
        </form>
      )}

      {open === "student" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const sectionId = studentSection ? Number(studentSection) : null;
              const res = await addStudent(lastName, firstName, sectionId);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(`Προστέθηκε: ${lastName} ${firstName}. Δώσε του κωδικό από τον πίνακα.`);
              setLastName("");
              setFirstName("");
              setOpen(null);
              router.push(`/admin/students?section=${sectionId ?? "none"}`);
              router.refresh();
            });
          }}
          className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Επώνυμο</span>
            <input
              required
              autoFocus
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Όνομα</span>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Τμήμα</span>
            <NativeSelect
              value={studentSection}
              onChange={(e) => setStudentSection(e.target.value)}
            >
              <option value="">— Χωρίς τμήμα —</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                  {s.custom && s.level ? ` (${LEVEL_LABELS[s.level]})` : ""}
                </option>
              ))}
            </NativeSelect>
          </label>
          <button type="submit" disabled={pending} className={primary}>
            {pending && <Loader2Icon className="size-4 animate-spin" />}
            Προσθήκη
          </button>
        </form>
      )}
    </div>
  );
}
