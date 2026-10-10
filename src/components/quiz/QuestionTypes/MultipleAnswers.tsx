"use client";

import { answerKeys } from "@/components/quiz/lib/questions";
import { useEffect, useState } from "react";
import type { Question } from "@/components/quiz/hooks/useQuestions";
import DynamicMath from "../DynamicMath";
const frameBg = "/quiz/images/bg.webp";

interface MultipleAnswersProps {
  question: Question;
  selectedAnswer: string;
  showExplanation: boolean;
  correctAnswer: string;
  onAnswer: (answer: string) => void;
}

export const MultipleAnswers = ({
  question,
  selectedAnswer,
  showExplanation,
  correctAnswer,
  onAnswer,
}: MultipleAnswersProps) => {
  const [hasAnswered, setHasAnswered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  // Helper to determine if the URL is a video
  const isVideo = question.questionImage?.match(/\.(mp4|webm|ogg)$/i);

  // ✅ Track when explanation was shown — keep colors after it's dismissed
  useEffect(() => {
    if (showExplanation) setHasAnswered(true);
  }, [showExplanation]);

  // ✅ Reset when a new question is loaded
  useEffect(() => {
    setHasAnswered(false);
  }, [question.idQuestion]);

  const availableAnswers = [
    { key: question.answerA.substring(0, 1), text: question.answerA },
    { key: question.answerB.substring(0, 1), text: question.answerB },
    { key: question.answerC.substring(0, 1), text: question.answerC },
    { key: question.answerD.substring(0, 1), text: question.answerD },
    { key: question.answerE.substring(0, 1), text: question.answerE },
  ].filter((answer) => answer.text);

  const selectedAnswers = selectedAnswer
    ? selectedAnswer.replace(/,/g, "").split("")
    : [];

  const correctAnswers = answerKeys(correctAnswer);

  const handleAnswerClick = (answerKey: string) => {
    // Prevent selection after explanation is shown
    if (showExplanation || hasAnswered) return;

    let newSelectedAnswers;
    if (selectedAnswers.includes(answerKey)) {
      newSelectedAnswers = selectedAnswers.filter((key) => key !== answerKey);
    } else {
      newSelectedAnswers = [...selectedAnswers, answerKey];
    }

    onAnswer(newSelectedAnswers.sort().join(""));
  };

  const isAnswerSelected = (key: string) => selectedAnswers.includes(key);
  const isAnswerCorrect = (key: string) => correctAnswers.includes(key);

  const getAnswerStyle = (key: string) => {
    const isSelected = isAnswerSelected(key);
    const isCorrect = isAnswerCorrect(key);

    // Keep color after explanation shown
    if (showExplanation || hasAnswered) {
      if (isCorrect) return "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      if (isSelected) return "border-red-500 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      return "border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-500 opacity-70";
    }

    // Before answer submission
    return isSelected
      ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-200 dark:ring-blue-900/50"
      : "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700";
  };

  const getCheckboxStyle = (key: string) => {
    const isSelected = isAnswerSelected(key);
    const isCorrect = isAnswerCorrect(key);

    if (showExplanation || hasAnswered) {
      if (isCorrect)
        return isSelected
          ? "border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500 text-white"
          : "border-green-400 bg-green-100 dark:border-green-700 dark:bg-green-900/50 text-green-600 dark:text-green-400";
      if (isSelected) return "border-red-600 bg-red-600 dark:border-red-500 dark:bg-red-500 text-white";
      return "border-gray-400 dark:border-gray-600 bg-white dark:bg-transparent";
    }

    return isSelected
      ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500 text-white"
      : "border-gray-400 dark:border-gray-500 bg-white dark:bg-transparent";
  };

  // Check if answers should be disabled
  const shouldDisableSelection = showExplanation || hasAnswered;

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

      {/* Question Text */}
      <div className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 text-start leading-snug bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg shadow-sm min-h-28 border border-transparent dark:border-blue-900/50 transition-colors duration-300">
        <div className="flex items-start gap-3">
          <div className="text-gray-900 dark:text-gray-100 wrap-break-word">
            <DynamicMath html={question.questionText} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {availableAnswers.map((answer) => {
          const isSelected = isAnswerSelected(answer.key);
          return (
            <button
              key={answer.key}
              aria-pressed={isSelected}
              onClick={() => handleAnswerClick(answer.key)}
              className={`p-4 rounded-lg border-2 text-left min-h-[60px] flex items-center gap-3 transform transition-all duration-300 active:scale-95 ${getAnswerStyle(
                answer.key,
              )} ${
                shouldDisableSelection
                  ? "cursor-default"
                  : "cursor-pointer"
              }`}
              disabled={shouldDisableSelection}
            >
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors duration-300 shrink-0 ${getCheckboxStyle(
                  answer.key,
                )}`}
              >
                {isSelected && (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <span className="flex-1 text-left text-inherit">
                <DynamicMath html={answer.text.substring(2)} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};