"use client";

import type { Question } from "@/components/quiz/hooks/useQuestions";
import DynamicMath from "@/components/quiz/DynamicMath";
import { useState } from "react";
const frameBg = "/quiz/images/bg.webp";

interface MultipleChoiceProps {
  question: Question;
  selectedAnswer: string;
  correctAnswer: string;
  onAnswer: (answer: string) => void;
  showExplanation: boolean;
  showNoAnswerWarning: boolean;
  isSubmitted: boolean;
  onCloseExplanation?: () => void;
}

export const MultipleChoice = ({
  question,
  selectedAnswer,
  correctAnswer,
  onAnswer,
  showExplanation,
  isSubmitted,
}: MultipleChoiceProps) => {
  const availableAnswers = [
    { key: question.answerA.substring(0, 1), text: question.answerA },
    { key: question.answerB.substring(0, 1), text: question.answerB },
    { key: question.answerC.substring(0, 1), text: question.answerC },
    { key: question.answerD.substring(0, 1), text: question.answerD },
    { key: question.answerE?.substring(0, 1), text: question.answerE },
  ].filter((answer) => answer.text);

  // ✅ Keep colors visible after submission or while explanation shown
  const showColors = isSubmitted || showExplanation;

  const [imageLoading, setImageLoading] = useState(true);

  const isAnswerSelected = (answerKey: string) => selectedAnswer === answerKey;
  const isAnswerCorrect = (answerKey: string) => answerKey === correctAnswer;

  // Helper to determine if the URL is a video
  const isVideo = question.questionImage?.match(/\.(mp4|webm|ogg)$/i);

  const getAnswerStyle = (answerKey: string) => {
    const isSelected = isAnswerSelected(answerKey);
    const isCorrectAnswer = isAnswerCorrect(answerKey);

    if (showColors) {
      if (isCorrectAnswer) {
        // Correct answer
        return "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      } else if (isSelected && !isCorrectAnswer) {
        // Wrong answer selected
        return "border-red-500 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      } else {
        // Neutral unselected answer
        return "border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-500 opacity-70";
      }
    } else {
      // During selection phase
      if (isSelected) {
        return "border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-200 dark:ring-blue-900/50";
      } else {
        return "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700";
      }
    }
  };

  const getOuterCircleStyle = (answerKey: string) => {
    const isSelected = isAnswerSelected(answerKey);
    const isCorrectAnswer = isAnswerCorrect(answerKey);

    if (showColors) {
      if (isCorrectAnswer) {
        return "border-green-500 dark:border-green-400"; // Correct - green border
      } else if (isSelected) {
        return "border-red-500 dark:border-red-400"; // Wrong selected - red border
      } else {
        return "border-gray-400 dark:border-gray-600"; // Neutral unselected
      }
    } else {
      return isSelected
        ? "border-blue-500 dark:border-blue-400" // Selected - blue border
        : "border-gray-400 dark:border-gray-500"; // Unselected
    }
  };

  const getInnerDotStyle = (answerKey: string) => {
    const isSelected = isAnswerSelected(answerKey);
    const isCorrectAnswer = isAnswerCorrect(answerKey);

    if (showColors) {
      if (isCorrectAnswer) {
        return "bg-green-500 dark:bg-green-400"; // Correct - green dot
      } else if (isSelected) {
        return "bg-red-500 dark:bg-red-400"; // Wrong selected - red dot
      } else {
        return "bg-transparent"; // Neutral unselected - no dot
      }
    } else {
      return isSelected
        ? "bg-blue-500 dark:bg-blue-400" // Selected - blue dot
        : "bg-transparent"; // Unselected - no dot
    }
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

      {/* Κουτί ερώτησης */}
      <div className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 text-start leading-snug bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg shadow-sm min-h-28 border border-transparent dark:border-blue-900/50 transition-colors duration-300">
        <div className="flex items-start gap-3">
          <div className="text-gray-900 dark:text-gray-100 wrap-break-word">
            <DynamicMath html={question.questionText} />
          </div>
        </div>
      </div>

      {/* Επιλογές */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {availableAnswers.map((answer) => {
          return (
            <button
              key={answer.key}
              aria-pressed={selectedAnswer === answer.key}
              disabled={isSubmitted || showExplanation}
              onClick={() => {
                if (!isSubmitted && !showExplanation) {
                  onAnswer(answer.key);
                }
              }}
              className={`transform active:scale-95 p-4 rounded-lg border-2 text-left transition-all duration-300 min-h-20 flex items-center gap-3 ${getAnswerStyle(
                answer.key,
              )}`}
            >
              {/* Radio button with outer circle and inner dot */}
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300 shrink-0 ${getOuterCircleStyle(
                  answer.key,
                )}`}
              >
                {/* Inner dot - only visible when selected */}
                <div
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${getInnerDotStyle(
                    answer.key,
                  )}`}
                />
              </div>

              {/* Answer text */}
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