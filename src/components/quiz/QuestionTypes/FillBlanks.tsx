"use client";

import { blankAnswerMap, blankIdsFor } from "@/components/quiz/lib/questions";
import { useState, useMemo, useEffect, type JSX } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import DynamicMath from "../DynamicMath";
import type { Question } from "@/components/quiz/hooks/useQuestions";
import { Button } from "@/components/ui/button";
import { X, HelpCircle } from "lucide-react";
const frameBg = "/quiz/images/bg.webp";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FillBlanksProps = {
  question: Question;
  selectedAnswer?: string;
  showExplanation: boolean;
  correctAnswer: string;
  onAnswer: (answer: string) => void;
  onAllAnswersFilled?: (allFilled: boolean) => void;
  onAnswersChange?: (answers: Record<string, string>) => void;
  isSubmitted: boolean;
  onCloseExplanation?: () => void;
  onAllCorrect?: (allCorrect: boolean) => void;
};

type Option = {
  value: string;
  label: string;
  isMath: boolean;
};

function normalizeAnswerText(text: string) {
  return text.replace(/^\d+\.\s*/, "");
}

/* ------------------------ MOBILE TOOLTIP ------------------------ */

const CorrectOptionContent = ({
  correctOption,
}: {
  correctOption: Option | null;
}) => {
  if (!correctOption) return null;

  return (
    <div>
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2 underline">
        Σωστή απάντηση:
      </div>
      <div className="flex items-start gap-2">
        <span className="text-green-800 dark:text-green-400 text-lg leading-tight">✔</span>
        <span className="text-gray-800 dark:text-gray-300 text-sm">
          {correctOption.isMath ? (
            <DynamicMath html={correctOption.label} />
          ) : (
            correctOption.label
          )}
        </span>
      </div>
    </div>
  );
};

const MobileTooltip = ({ correctOption }: { correctOption: Option | null }) => {
  const [open, setOpen] = useState(false);
  if (!correctOption) return null;

  return (
    <div className="relative inline-block">
      <button type="button" aria-label="Σωστή απάντηση" aria-expanded={open} onClick={() => setOpen((v) => !v)}><HelpCircle className="h-4 w-4 text-red-400 ml-1" /></button>
      {open && (
        <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 p-4 rounded-md shadow-lg bg-orange-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-w-xs w-48 transition-colors duration-300">
          <CorrectOptionContent correctOption={correctOption} />
        </div>
      )}
    </div>
  );
};

/* ------------------------ MAIN COMPONENT ------------------------ */

export const FillBlanks = ({
  question,
  selectedAnswer = "",
  showExplanation,
  onAnswer,
  onAllAnswersFilled,
  onAnswersChange,
  isSubmitted,
  onAllCorrect,
}: FillBlanksProps) => {
  const rawAnswers = [
    question.answerA,
    question.answerB,
    question.answerC,
    question.answerD,
    question.answerE,
  ].filter(Boolean) as string[];

  const showColors = isSubmitted || showExplanation;
  const [imageLoading, setImageLoading] = useState(true);
  // Helper to determine if the URL is a video
  const isVideo = question.questionImage?.match(/\.(mp4|webm|ogg)$/i);

  const allOptions = useMemo<Option[]>(() => {
    return rawAnswers.map((txt, idx) => {
      const numberMatch = txt.match(/^(\d+)\./);
      const value = numberMatch ? numberMatch[1] : (idx + 1).toString();
      const label = normalizeAnswerText(txt);

      return {
        value,
        label,
        isMath: label.includes("$"),
      };
    });
  }, [rawAnswers]);

  const questionText = question.questionText;

  const correctByBlank = blankAnswerMap(question);
  const blankIds = useMemo(() => {
    return blankIdsFor(questionText);
  }, [questionText]);

  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(blankIdsFor(question.questionText).map((id, index) => [id, selectedAnswer.split(",")[index] || ""])));


  useEffect(() => {
    const allFilled = blankIds.length > 0 && blankIds.every((id) => !!answers[id]);
    onAllAnswersFilled?.(allFilled);
    onAnswersChange?.(answers);
    if (allFilled && showColors) {
      const correct = blankIds.every((id) => answers[id] === blankAnswerMap(question)[id]);
      onAllCorrect?.(correct);
    }
  }, [
    answers,
    question,
    blankIds,
    showColors,
    onAllAnswersFilled,
    onAnswersChange,
    onAllCorrect,
  ]);

  useEffect(() => {
    const joined = blankIds.map((id) => answers[id] || "").join(",");
    onAnswer(joined);
  }, [answers, blankIds, onAnswer]);

  const handleAnswerChange = (blankId: string, value: string) => {
    if (showExplanation) return;
    setAnswers((prev) => ({ ...prev, [blankId]: value }));
  };

  const getAvailableOptions = () => allOptions;

  const isBlankCorrect = (blankId: string) => answers[blankId] === correctByBlank[blankId];

  /* ------------------------ RENDER TEXT WITH SELECTS ------------------------ */

  const renderQuestionWithSelects = () => {
    const parts = questionText.split(/(word\d+)/);
    const isTouchDevice = () =>
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    return parts.map((part, idx) => {
      const match = part.match(/word(\d+)/);
      if (match) {
        const blankId = match[1];
        const options = getAvailableOptions();
        const currentValue = answers[blankId] || "";
        const hasSelection = currentValue !== "";
        const correct = isBlankCorrect(blankId);
        const incorrect = showColors && hasSelection && !correct;

        const selectedOption = allOptions.find((o) => o.value === currentValue);
        const correctOption =
          allOptions.find((o) => o.value === correctByBlank[blankId]) ?? null;

        return (
          <span
            key={idx}
            className="inline-flex items-center space-x-1 align-middle"
          >
            <Select
              key={`${blankId}-${currentValue || "empty"}`}
              value={currentValue}
              onValueChange={(v) => handleAnswerChange(blankId, v)}
              disabled={showColors}
            >
              <SelectTrigger
                aria-label={`Απάντηση για το κενό ${blankId}`}
                className={`mx-1 inline-flex w-fit min-w-[100px] border rounded-md px-3 h-9 items-center justify-between gap-2 shrink-0 transition-colors duration-300 ${
                  showColors
                    ? correct
                      ? "bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-500/70 text-black dark:text-white"
                      : incorrect
                        ? "bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-500/70 text-black dark:text-white"
                        : "bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    : "bg-white dark:bg-gray-900 border-indigo-500 dark:border-indigo-500/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-black dark:text-gray-100"
                }`}
              >
                <div className="flex-1 text-left truncate">
                  {hasSelection && selectedOption ? (
                    selectedOption.isMath ? (
                      <DynamicMath html={selectedOption.label} />
                    ) : (
                      selectedOption.label
                    )
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Επιλέξτε...</span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.isMath ? <DynamicMath html={o.label} /> : o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!showColors && hasSelection && (
              <Button
                type="button"
                aria-label={`Καθαρισμός κενού ${blankId}`}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full shrink-0 transition-colors"
                onClick={() => handleAnswerChange(blankId, "")}
              >
                <X className="h-3 w-3 text-red-500 dark:text-red-400" />
              </Button>
            )}

            {showColors &&
              incorrect &&
              (isTouchDevice() ? (
                <MobileTooltip correctOption={correctOption} />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Σωστή απάντηση"><HelpCircle className="h-4 w-4 text-red-400 ml-1 shrink-0" /></button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="p-4 bg-orange-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 transition-colors duration-300"
                  >
                    <CorrectOptionContent correctOption={correctOption} />
                  </TooltipContent>
                </Tooltip>
              ))}
          </span>
        );
      }

      // PROCESS INLINE MATH
      const mathRegex = /\$(.+?)\$/g;
      const segments: JSX.Element[] = [];
      let last = 0;
      let m;
      while ((m = mathRegex.exec(part)) !== null) {
        if (m.index > last)
          segments.push(
            <span key={`${idx}-t-${last}`}>{part.slice(last, m.index)}</span>,
          );
        segments.push(
          <DynamicMath key={`${idx}-m-${m.index}`} html={`$${m[1]}$`} />,
        );
        last = m.index + m[0].length;
      }
      if (last < part.length)
        segments.push(<span key={`${idx}-t-end`}>{part.slice(last)}</span>);
      return <span key={idx}>{segments}</span>;
    });
  };

  return (
    <div className="relative w-full px-2 sm:px-4 select-none">
      {/* Question Media (Image or Video) */}
      {question.questionImage && (
        <div className="mb-4 sm:mb-6 flex justify-center relative">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg z-10 transition-colors duration-300">
              <div className="animate-spin h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full" />
            </div>
          )}

          {isVideo ? (
            <video
              src={question.questionImage}
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setImageLoading(false)}
              className={`max-w-full max-h-60 sm:max-h-70 rounded-lg shadow-md object-contain transition-opacity duration-500 ${
                imageLoading ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : (
            <div className="relative w-full flex items-center justify-center p-6">
              {/* Loading spinner - shown while remote image loads */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="animate-spin h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full" />
                </div>
              )}

              {/* Actual question image */}
              <img
                src={question.questionImage}
                alt="Question"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
                className={`max-w-full max-h-60 sm:max-h-70 object-contain transition-opacity duration-500 z-0 ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
              />

              {/* Frame - always visible, local so loads instantly */}
              <img
                src={frameBg}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 dark:opacity-80 transition-opacity duration-300"
              />
            </div>
          )}
        </div>
      )}

      <div className="text-md sm:text-l text-gray-800 dark:text-gray-200 mb-4 text-start leading-[3.0] bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg shadow-sm min-h-28 border border-transparent dark:border-blue-900/50 transition-colors duration-300">
        <div className="text-gray-900 dark:text-gray-100 wrap-break-word">
          {renderQuestionWithSelects()}
        </div>
      </div>
    </div>
  );
};