"use client";

import "katex/dist/katex.min.css";
import "./quiz.css";

import { useState } from "react";

import type { Question } from "./lib/questions";
import { FillBlanks } from "./QuestionTypes/FillBlanks";
import { FillBlanksDrop } from "./QuestionTypes/FillBlanksDrop";
import { MultipleAnswers } from "./QuestionTypes/MultipleAnswers";
import { MultipleChoice } from "./QuestionTypes/MultipleChoice";
import { Sorting } from "./QuestionTypes/Sorting";
import { TrueFalse } from "./QuestionTypes/TrueFalse";

/**
 * Μια ερώτηση όπως θα τη δει ο μαθητής (ίδια components με το quiz), για τη
 * σελίδα διαχείρισης. «Δείξε λύση» = ό,τι βλέπει ο μαθητής μετά τον έλεγχο.
 */
export default function QuestionPreview({ question }: { question: Question }) {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [solved, setSolved] = useState(false);

  const common = {
    question,
    selectedAnswer,
    showExplanation: solved,
    correctAnswer: question.correctAnswer,
    onAnswer: (a: string) => {
      if (!solved) setSelectedAnswer(a);
    },
    showNoAnswerWarning: false,
    isSubmitted: solved,
  };

  let body: React.ReactNode = null;
  switch (question.questionNumber) {
    case 1:
      body = <FillBlanks {...common} onAllAnswersFilled={() => {}} />;
      break;
    case 2:
      body = <TrueFalse {...common} onCloseExplanation={() => setSolved(false)} />;
      break;
    case 3:
      body = <MultipleAnswers {...common} />;
      break;
    case 4:
      body = <MultipleChoice {...common} onCloseExplanation={() => setSolved(false)} />;
      break;
    case 5:
      body = <Sorting {...common} />;
      break;
    case 6:
      body = <FillBlanksDrop {...common} onAllAnswersFilled={() => {}} />;
      break;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border bg-white p-2 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        {body}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSolved((s) => !s)}
          className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
        >
          {solved ? "Απόκρυψη λύσης" : "Δείξε λύση"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSolved(false);
            setSelectedAnswer("");
          }}
          className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
        >
          Επαναφορά
        </button>
      </div>
    </div>
  );
}
