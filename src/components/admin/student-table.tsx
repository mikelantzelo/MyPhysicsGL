"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DownloadIcon,
  KeyRoundIcon,
  Loader2Icon,
  PrinterIcon,
  WandSparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  changeStudentEnabled,
  changeStudentSection,
  issueLoginCodes,
  studentsWithoutCode,
} from "@/app/student-actions";
import type { Section } from "@/lib/admin";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { NativeSelect } from "@/components/ui/native-select";
import type { StudentRow } from "@/lib/students";

const CHUNK = 5;

export function StudentTable({
  students,
  sections,
  sectionFilter,
}: {
  students: StudentRow[];
  sections: Section[];
  sectionFilter: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const sectionLabel = new Map(sections.map((s) => [s.id, s.label]));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Προειδοποίηση αν κλείσει η σελίδα στη μέση της μαζικής δημιουργίας.
  useEffect(() => {
    if (!progress) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [progress]);

  /** Κωδικοί σε κομμάτια, με πρόοδο. */
  const run = async (ids: number[]) => {
    let failed = 0;
    setProgress({ done: 0, total: ids.length });
    for (let i = 0; i < ids.length; i += CHUNK) {
      const res = await issueLoginCodes(ids.slice(i, i + CHUNK));
      failed += res.filter((r) => r.error).length;
      res.filter((r) => r.error).forEach((r) => console.error(r.id, r.error));
      setProgress({ done: Math.min(i + CHUNK, ids.length), total: ids.length });
    }
    setProgress(null);
    setSelected(new Set());
    if (failed) toast.error(`${failed} κωδικοί απέτυχαν (δες την κονσόλα).`);
    else toast.success(`Δημιουργήθηκαν ${ids.length} κωδικοί.`);
    router.refresh();
  };

  const issue = async (ids: number[]) => {
    if (!ids.length) return;
    const replacing = students.filter((s) => ids.includes(s.id) && s.loginCode).length;
    if (
      replacing &&
      !(await confirm({
        title: "Νέος κωδικός;",
        description: `${replacing === 1 ? "Ο μαθητής έχει" : `${replacing} μαθητές έχουν`} ήδη κωδικό — ο παλιός θα πάψει να ισχύει.`,
        confirmLabel: "Νέος κωδικός",
        destructive: true,
      }))
    ) {
      return;
    }
    startTransition(() => run(ids));
  };

  /** Όλοι οι μαθητές όλων των τμημάτων που δεν έχουν κωδικό. */
  const issueAll = () =>
    startTransition(async () => {
      const { ids, withoutSection } = await studentsWithoutCode();
      if (!ids.length) {
        toast.info("Όλοι οι μαθητές έχουν ήδη κωδικό.");
        return;
      }
      const minutes = Math.max(1, Math.round((ids.length / CHUNK) * 3 / 60));
      const note = withoutSection
        ? `

Προσοχή: ${withoutSection} από αυτούς δεν έχουν τμήμα — θα μπαίνουν, αλλά δεν θα βλέπουν περιεχόμενο μέχρι να μπουν σε τμήμα.`
        : "";
      const ok = await confirm({
        title: `Δημιουργία ${ids.length} κωδικών;`,
        description: `Για όλους τους μαθητές χωρίς κωδικό, σε όλα τα τμήματα. Θα πάρει περίπου ${minutes} λεπτά — μην κλείσεις τη σελίδα.${note}`,
        confirmLabel: "Δημιουργία",
      });
      if (!ok) return;
      await run(ids);
    });

  const withoutCode = students.filter((s) => !s.loginCode).map((s) => s.id);

  const downloadCsv = () => {
    const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = students
      .filter((s) => s.loginCode)
      .map((s) =>
        [s.name, s.registrationNumber, sectionLabel.get(s.sectionId ?? -1) ?? "", s.loginCode ?? ""]
          .map(cell)
          .join(";"),
      );
    const csv = "﻿" + ["Ονοματεπώνυμο;ΑΜ;Τμήμα;Κωδικός", ...lines].join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `kodikoi-${sectionFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || selected.size === 0}
          onClick={() => issue([...selected])}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <KeyRoundIcon className="size-4" />
          Κωδικός στους επιλεγμένους ({selected.size})
        </button>
        <button
          type="button"
          disabled={pending || withoutCode.length === 0}
          onClick={() => issue(withoutCode)}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          <KeyRoundIcon className="size-4" />
          Κωδικός σε όσους δεν έχουν ({withoutCode.length})
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={issueAll}
          className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-500/20 disabled:opacity-50 dark:text-violet-300"
        >
          <WandSparklesIcon className="size-4" />
          Δημιουργία όλων των κωδικών
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <DownloadIcon className="size-4" />
          CSV
        </button>
        <a
          href={`/print/students?section=${sectionFilter}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <PrinterIcon className="size-4" />
          Εκτύπωση καρτών
        </a>
        {progress && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            {progress.done} / {progress.total}
          </span>
        )}
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Δεν βρέθηκαν μαθητές.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Επιλογή όλων"
                    checked={selected.size === students.length}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(students.map((s) => s.id)) : new Set())
                    }
                  />
                </th>
                <th className="px-3 py-2 font-medium">Ονοματεπώνυμο</th>
                <th className="px-3 py-2 font-medium">ΑΜ</th>
                <th className="px-3 py-2 font-medium">Τμήμα</th>
                <th className="px-3 py-2 font-medium">Κωδικός</th>
                <th className="px-3 py-2 font-medium">Λογαριασμός</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((s) => (
                <tr key={s.id} className={selected.has(s.id) ? "bg-primary/5" : ""}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Επιλογή ${s.name}`}
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {s.registrationNumber}
                  </td>
                  <td className="px-3 py-2">
                    <NativeSelect
                      aria-label={`Τμήμα ${s.name}`}
                      defaultValue={s.sectionId ?? ""}
                      disabled={pending}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        startTransition(async () => {
                          await changeStudentSection(s.id, v);
                          toast.success(`${s.name}: ${v ? sectionLabel.get(v) : "χωρίς τμήμα"}`);
                          router.refresh();
                        });
                      }}
                      size="sm"
                      wrapperClassName="w-20"
                    >
                      <option value="">—</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {s.loginCode ? (
                      <code className="rounded bg-muted px-1.5 py-0.5">{s.loginCode}</code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => issue([s.id])}
                      className="ml-2 text-xs text-primary underline disabled:opacity-50"
                    >
                      {s.loginCode ? "νέος" : "δημιουργία"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    {s.enabled == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          disabled={pending}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            startTransition(async () => {
                              await changeStudentEnabled(s.id, enabled);
                              toast.success(`${s.name}: ${enabled ? "ενεργός" : "απενεργοποιήθηκε"}`);
                              router.refresh();
                            });
                          }}
                        />
                        <span className={s.enabled ? "" : "text-destructive"}>
                          {s.enabled ? "ενεργός" : "ανενεργός"}
                        </span>
                      </label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
