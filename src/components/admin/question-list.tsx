"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DownloadIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { deleteQuestion, importQuestions } from "@/app/admin-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { QuestionRow } from "@/lib/admin";

import { QUESTION_TYPES, QuestionForm } from "./question-form";

/** Το κείμενο χωρίς HTML, για τη λίστα. */
const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const CSV_HEADER =
  "questionNumber;questionText;answerA;answerB;answerC;answerD;answerE;correctAnswer;questionImage";

/** Πρότυπο CSV με ένα παράδειγμα από κάθε τύπο (Excel: ; ως διαχωριστικό). */
function templateCsv(): string {
  const cell = (v = "") => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = Object.entries(QUESTION_TYPES).map(([n, t]) => {
    const e = t.example;
    return [n, e.questionText, e.answerA, e.answerB, e.answerC, e.answerD, e.answerE, e.correctAnswer, ""]
      .map((v) => cell(v ?? ""))
      .join(";");
  });
  return "﻿" + [CSV_HEADER, ...lines].join("\r\n") + "\r\n";
}

export function QuestionList({
  idChapter,
  questions,
}: {
  idChapter: string;
  questions: QuestionRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const done = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon className="size-4" />
          Νέα ερώτηση
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-60"
        >
          {pending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <UploadIcon className="size-4" />
          )}
          Εισαγωγή από CSV
        </button>
        <button
          type="button"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([templateCsv()], { type: "text/csv;charset=utf-8" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "erotiseis-protypo.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <DownloadIcon className="size-4" />
          Πρότυπο CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setImportErrors([]);
            startTransition(async () => {
              const res = await importQuestions(idChapter, await file.text());
              if (res.ok) {
                toast.success(`Προστέθηκαν ${res.count} ερωτήσεις.`);
                router.refresh();
              } else {
                setImportErrors(res.errors);
              }
            });
          }}
        />
      </div>

      {importErrors.length > 0 && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            Δεν έγινε εισαγωγή — διόρθωσε το αρχείο και ξαναδοκίμασε:
          </p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {importErrors.slice(0, 20).map((e) => (
              <li key={e}>{e}</li>
            ))}
            {importErrors.length > 20 && <li>…και {importErrors.length - 20} ακόμα</li>}
          </ul>
        </div>
      )}

      {editing === "new" && <QuestionForm idChapter={idChapter} onDone={done} />}

      {questions.length === 0 && editing !== "new" ? (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Δεν υπάρχουν ερωτήσεις σε αυτή την παράγραφο.
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {questions.map((q, i) =>
            editing === q.rowId ? (
              <li key={q.rowId}>
                <QuestionForm idChapter={idChapter} initial={q} rowId={q.rowId} onDone={done} />
              </li>
            ) : (
              <li key={q.rowId} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
                <span className="mt-0.5 text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{plain(q.questionText)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                      {QUESTION_TYPES[q.questionNumber]?.label ?? `Τύπος ${q.questionNumber}`}
                    </span>{" "}
                    Σωστή: <code>{q.correctAnswer}</code>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Επεξεργασία"
                  onClick={() => setEditing(q.rowId)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Διαγραφή"
                  disabled={pending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Διαγραφή ερώτησης;",
                      description: plain(q.questionText).slice(0, 160),
                      confirmLabel: "Διαγραφή",
                      destructive: true,
                    });
                    if (!ok) return;
                    startTransition(async () => {
                      await deleteQuestion(q.rowId);
                      toast.success("Η ερώτηση διαγράφηκε.");
                      router.refresh();
                    });
                  }}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  );
}
