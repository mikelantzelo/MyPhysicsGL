"use client";

import type { Question } from "@/components/quiz/hooks/useQuestions";
import DynamicMath from "../DynamicMath";
import { useState } from "react";
import { ThumbsDown, ThumbsUp, Check, X } from "lucide-react";
const frameBg = "/quiz/images/bg.webp";

interface TrueFalseProps {
  question: Question;
  selectedAnswer: string;
  correctAnswer: string;
  onAnswer: (answer: string) => void;
  showExplanation: boolean;
  showNoAnswerWarning: boolean;
  isSubmitted: boolean;
  onCloseExplanation?: () => void;
}

export const TrueFalse = ({
  question,
  selectedAnswer,
  correctAnswer,
  onAnswer,
  showExplanation,
  isSubmitted,
}: TrueFalseProps) => {
  const trueFalseAnswers = [
    { key: "1", text: "Σωστό" },
    { key: "2", text: "Λάθος" },
  ];

  const [imageLoading, setImageLoading] = useState(true);
  const showColors = isSubmitted || showExplanation;
  const [clickedKey, setClickedKey] = useState<string | null>(null);
  
  // Helper to determine if the URL is a video
  const isVideo = question.questionImage?.match(/\.(mp4|webm|ogg)$/i);

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
      <div className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 text-start leading-snug bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg shadow-sm min-h-28 transition-colors duration-300 border border-transparent dark:border-blue-900/50">
        <div className="flex items-start gap-3">
          <div className="text-gray-900 dark:text-gray-100 wrap-break-word">
            <DynamicMath html={question.questionText} />
          </div>
        </div>
      </div>

      {/* Answer Buttons */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {trueFalseAnswers.map((answer) => {
          const isCorrect = answer.key === correctAnswer;
          const isSelected = selectedAnswer === answer.key;
          const isClicked = clickedKey === answer.key;
          const IconComponent = answer.key === "1" ? ThumbsUp : ThumbsDown;

          let classes = "border transition-all duration-300 ";

          if (showColors) {
            if (isSelected) {
              // ONLY the selected button gets colored
              classes += isCorrect
                ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 shadow-md"
                : "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 shadow-md";
            } else {
              // The other button stays neutral/gray regardless of being "correct"
              classes += "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 opacity-60";
            }
          } else {
            // Selection state before submitting
            classes += isSelected
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 ring-2 ring-blue-100 dark:ring-blue-900/50"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700";
          }

          return (
            <button
              key={answer.key}
              aria-pressed={selectedAnswer === answer.key}
              disabled={isSubmitted || showExplanation}
              onClick={() => {
                setClickedKey(answer.key);
                onAnswer(answer.key);
                setTimeout(() => setClickedKey(null), 200);
              }}
              className={`
                ${classes}
                relative mt-4 flex flex-col items-center justify-center p-4 pt-6 rounded-xl border-2 min-h-28
                transform transition-transform active:scale-95
                ${isClicked ? "scale-105" : ""}
              `}
            >
              {/* Badge: Only shows on the user's selection */}
              {showColors && isSelected && (
                <div
                  className={`
          absolute -top-3 left-1/2 -translate-x-1/2 z-20
          flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black shadow-md
          animate-in fade-in zoom-in duration-300
          ${isCorrect ? "bg-green-600 ring-4 ring-white dark:ring-gray-900" : "bg-red-600 ring-4 ring-white dark:ring-gray-900"}
          text-white
        `}
                >
                  {isCorrect ? (
                    <>
                      <Check size={12} strokeWidth={3} /> ΣΩΣΤΟ
                    </>
                  ) : (
                    <>
                      <X size={12} strokeWidth={3} /> ΛΑΘΟΣ
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center">
                <IconComponent
                  size={32}
                  className={`
                    mb-1 transition-all duration-300
                    ${isClicked ? "scale-125 -translate-y-1" : ""}
                    ${isSelected ? "text-inherit" : "text-gray-500 dark:text-gray-400"}
                  `}
                />
                <span className="text-base sm:text-md font-bold tracking-tight">
                  {answer.text}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};