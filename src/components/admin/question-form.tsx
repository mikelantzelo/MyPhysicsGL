"use client";

import { lazy, Suspense, useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { saveQuestion, type QuestionInput } from "@/app/admin-actions";
import { NativeSelect } from "@/components/ui/native-select";

const QuestionPreview = lazy(() => import("@/components/quiz/QuestionPreview"));

/** Οι 6 τύποι του quiz (στήλη `questionNumber`) με οδηγίες μορφής. */
export const QUESTION_TYPES: Record<
  number,
  { label: string; help: string; answers: boolean; example: Partial<QuestionInput> }
> = {
  2: {
    label: "Σωστό / Λάθος",
    help: "Χωρίς απαντήσεις. Σωστή απάντηση: 1 = Σωστό, 2 = Λάθος.",
    answers: false,
    example: { questionText: "Το ηλεκτρικό φορτίο διατηρείται.", correctAnswer: "1" },
  },
  4: {
    label: "Μία σωστή απάντηση",
    help: "Απαντήσεις με αριθμό μπροστά: «1. …», «2. …». Σωστή: ο αριθμός της σωστής, π.χ. 2.",
    answers: true,
    example: {
      questionText: "Ποιο σωματίδιο έχει αρνητικό φορτίο;",
      answerA: "1. Πρωτόνιο",
      answerB: "2. Ηλεκτρόνιο",
      answerC: "3. Νετρόνιο",
      correctAnswer: "2",
    },
  },
  3: {
    label: "Πολλές σωστές απαντήσεις",
    help: "Απαντήσεις «1. …», «2. …». Σωστή: όλοι οι αριθμοί των σωστών μαζί, π.χ. 13.",
    answers: true,
    example: {
      questionText: "Ποιοι είναι τρόποι ηλέκτρισης;",
      answerA: "1. Τριβή",
      answerB: "2. Θέρμανση",
      answerC: "3. Επαφή",
      correctAnswer: "13",
    },
  },
  5: {
    label: "Ταξινόμηση",
    help: "Απαντήσεις «1. …», «2. …» (το quiz τις ανακατεύει). Σωστή: η σωστή σειρά με ερωτηματικό, π.χ. 1;2;3.",
    answers: true,
    example: {
      questionText: "Βάλε στη σωστή σειρά.",
      answerA: "1. Πρώτο",
      answerB: "2. Δεύτερο",
      answerC: "3. Τρίτο",
      correctAnswer: "1;2;3",
    },
  },
  1: {
    label: "Κενά με λίστα επιλογών",
    help: "Στο κείμενο γράψε word1, word2, … στη θέση κάθε κενού. Απαντήσεις «1. λέξη», «2. λέξη». Σωστή: ο αριθμός για κάθε κενό με τη σειρά, π.χ. 21 ή 2,1.",
    answers: true,
    example: {
      questionText: "Τα ομώνυμα φορτία word1, ενώ τα ετερώνυμα word2.",
      answerA: "1. έλκονται",
      answerB: "2. απωθούνται",
      correctAnswer: "21",
    },
  },
  6: {
    label: "Σύρσιμο λέξεων στα κενά",
    help: "Όπως τα «κενά με λίστα», αλλά κάθε απάντηση χρησιμοποιείται μία μόνο φορά (όχι επαναλήψεις στη σωστή).",
    answers: true,
    example: {
      questionText: "Τα ομώνυμα φορτία word1, ενώ τα ετερώνυμα word2.",
      answerA: "1. έλκονται",
      answerB: "2. απωθούνται",
      correctAnswer: "21",
    },
  },
};

const EMPTY = {
  questionText: "",
  questionImage: "",
  answerA: "",
  answerB: "",
  answerC: "",
  answerD: "",
  answerE: "",
  correctAnswer: "",
};

const ANSWER_FIELDS = ["answerA", "answerB", "answerC", "answerD", "answerE"] as const;

const input =
  "w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function QuestionForm({
  idChapter,
  initial,
  rowId,
  onDone,
}: {
  idChapter: string;
  initial?: QuestionInput;
  rowId?: string;
  onDone: () => void;
}) {
  const [q, setQ] = useState<QuestionInput>(
    initial ?? { idChapter, questionNumber: 4, ...EMPTY },
  );
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [pending, startTransition] = useTransition();
  const type = QUESTION_TYPES[q.questionNumber];

  const set = (patch: Partial<QuestionInput>) => {
    setQ((prev) => ({ ...prev, ...patch }));
    setPreview(false);
    setError(null);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveQuestion(q, rowId);
          if (res.ok) {
            toast.success(rowId ? "Η ερώτηση ενημερώθηκε." : "Η ερώτηση προστέθηκε.");
            onDone();
          } else {
            setError(res.error);
          }
        });
      }}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <label className="text-sm font-medium" htmlFor="q-type">
          Τύπος
        </label>
        <NativeSelect
          id="q-type"
          value={q.questionNumber}
          onChange={(e) => set({ questionNumber: Number(e.target.value) })}
          wrapperClassName="sm:w-72"
        >
          {Object.entries(QUESTION_TYPES).map(([n, t]) => (
            <option key={n} value={n}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
        <button
          type="button"
          onClick={() => set({ ...EMPTY, ...type.example })}
          className="self-start text-xs text-primary underline sm:self-auto"
        >
          Συμπλήρωσε παράδειγμα
        </button>
      </div>
      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        {type.help} Μαθηματικά με KaTeX: <code>$E = mc^2$</code>.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Κείμενο ερώτησης</span>
        <textarea
          required
          rows={3}
          value={q.questionText}
          onChange={(e) => set({ questionText: e.target.value })}
          className={input}
        />
      </label>

      {type.answers && (
        <div className="grid gap-2 sm:grid-cols-2">
          {ANSWER_FIELDS.map((f, i) => (
            <input
              key={f}
              aria-label={`Απάντηση ${i + 1}`}
              placeholder={`${i + 1}. …${i >= 2 ? " (προαιρετική)" : ""}`}
              value={q[f]}
              onChange={(e) => set({ [f]: e.target.value })}
              className={input}
            />
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Σωστή απάντηση</span>
          <input
            required
            value={q.correctAnswer}
            onChange={(e) => set({ correctAnswer: e.target.value })}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Εικόνα/βίντεο (URL, προαιρετικό)</span>
          <input
            type="url"
            value={q.questionImage}
            onChange={(e) => set({ questionImage: e.target.value })}
            className={input}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {preview && (
        <Suspense fallback={<Loader2Icon className="size-5 animate-spin text-primary" />}>
          <QuestionPreview
            question={{ ...q, idQuestion: rowId ?? "preview", imgNumber: "" }}
          />
        </Suspense>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {pending && <Loader2Icon className="size-4 animate-spin" />}
          Αποθήκευση
        </button>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="rounded-md border px-4 py-1.5 text-sm hover:bg-muted"
        >
          {preview ? "Κλείσιμο προεπισκόπησης" : "Προεπισκόπηση"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          Άκυρο
        </button>
      </div>
    </form>
  );
}
