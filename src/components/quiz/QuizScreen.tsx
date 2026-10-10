"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { currentAttemptKey, readAttempt } from "@/components/quiz/lib/attempt";
import { removeSession, writeSession } from "@/components/quiz/lib/storage";
import { formatApiTime as formatTime } from "@/components/quiz/lib/time";
import type { Question } from "@/components/quiz/lib/questions";
import { isAnswerCorrect } from "@/components/quiz/lib/questions";
import { soundEnabled } from "@/components/quiz/lib/sound";
import type { QuizResults } from "./lib/types";
import { useQuestions } from "@/components/quiz/hooks/useQuestions";
import { FillBlanks } from "./QuestionTypes/FillBlanks";
import { TrueFalse } from "./QuestionTypes/TrueFalse";
import { MultipleAnswers } from "./QuestionTypes/MultipleAnswers";
import { MultipleChoice } from "./QuestionTypes/MultipleChoice";
import { Sorting } from "./QuestionTypes/Sorting";
import { ArrowRight, Check, LogOut, Star, Timer } from "lucide-react";
import { FillBlanksDrop } from "./QuestionTypes/FillBlanksDrop";


interface QuizScreenProps {
  idChapter: string;
  questionCount: number;
  onBack: () => void;
  onQuizComplete: (results: QuizResults) => void;
}


function QuizScreen({
  idChapter,
  questionCount,
  onBack,
  onQuizComplete,
}: QuizScreenProps) {
  const [storageKey] = useState(() => currentAttemptKey(idChapter));
  const [saved] = useState(() => {
    const value = storageKey ? readAttempt(storageKey) : null;
    return value?.questionCount === questionCount ? value : null;
  });
  const [attemptId] = useState(() => saved?.attemptId ?? crypto.randomUUID());
  const finishedRef = useRef(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(saved?.currentQuestion ?? 1);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [timeSpent, setTimeSpent] = useState(saved?.timeSpent ?? 0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(saved?.selectedAnswer ?? "");
  const [showExplanation, setShowExplanation] = useState(saved?.isSubmitted ?? false);
  const [isSubmitted, setIsSubmitted] = useState(saved?.isSubmitted ?? false);
  const [showNoAnswerWarning, setShowNoAnswerWarning] = useState(false);
  const [allFillBlanksFilled, setAllFillBlanksFilled] = useState(false);
  const [allFillBlanksDropFilled, setAllFillBlanksDropFilled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const {
    data: questions,
    isLoading,
    error,
  } = useQuestions(idChapter, questionCount, saved?.questions, attemptId);

  const [animateStar, setAnimateStar] = useState(false);
  const [shake, setShake] = useState(false);

  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const falseSoundRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    correctSoundRef.current = new Audio("/quiz/sounds/correct.mp3");
    falseSoundRef.current = new Audio("/quiz/sounds/false.mp3");
    const stop = () => { correctSoundRef.current?.pause(); falseSoundRef.current?.pause(); };
    window.addEventListener("quiz-sound-change", stop);
    return () => { stop(); window.removeEventListener("quiz-sound-change", stop); };
  }, []);

  const playSound = (type: "correct" | "false") => {
    if (!soundEnabled()) return;
    const audio = type === "correct" ? correctSoundRef.current : falseSoundRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch((err) => console.error("Audio playback failed:", err));
  };


  useEffect(() => {
    if (!questions?.length || error) return;
    const start = Date.now();
    const initial = saved?.timeSpent ?? 0;
    const timer = setInterval(() => setTimeSpent(initial + Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [questions, error, saved]);

  useEffect(() => {
    if (!questions?.length || finishedRef.current) return;
    if (!storageKey) { setStorageAvailable(false); return; }
    setStorageAvailable(writeSession(storageKey, { attemptId, questionCount, questions, currentQuestion, score, timeSpent, selectedAnswer, isSubmitted }));
  }, [storageKey, attemptId, questionCount, questions, currentQuestion, score, timeSpent, selectedAnswer, isSubmitted]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (!finishedRef.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Τα αποτελέσματα «μέχρι τώρα»: όσες ερωτήσεις δεν απαντήθηκαν μετρούν λάθος.
  const resultsSoFar = (): QuizResults => ({
    attemptId,
    score: (score / questionCount) * 100,
    totalQuestions: questionCount,
    correctAnswers: score,
    timeSpent,
    timeSpentFormatted: formatTime(timeSpent),
  });
  const latestResultsRef = useRef(resultsSoFar);
  useEffect(() => {
    latestResultsRef.current = resultsSoFar;
  });

  const finishEarly = () => {
    finishedRef.current = true;
    if (storageKey) removeSession(storageKey);
    setConfirmExit(false);
    setQuizCompleted(true);
    onQuizComplete(resultsSoFar());
  };

  /**
   * Όσο τρέχει το τεστ, ο μαθητής δεν φεύγει από αυτό: κλικ/πλήκτρα έξω από το
   * quiz (μενού, καρτέλες, μπάρα) και το «πίσω» του browser ανοίγουν ερώτηση
   * τερματισμού. Αν κλείσει/ανανεώσει τη σελίδα, στέλνονται τα αποτελέσματα
   * μέχρι εκείνη τη στιγμή (sendBeacon).
   */
  const locked = !!questions?.length && !error && !quizCompleted;
  useEffect(() => {
    if (!locked) return;

    const outside = (e: Event) =>
      !!rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target);
    const block = (e: Event) => {
      if (!outside(e)) return false;
      e.preventDefault();
      e.stopImmediatePropagation();
      return true;
    };
    const ask = (e: Event) => {
      if (block(e)) setConfirmExit(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") ask(e);
    };

    // Ένα επιπλέον βήμα στο ιστορικό ώστε το «πίσω» να μένει στη σελίδα.
    // Κρατάμε το state του Next ώστε ο router του να μην κάνει reload.
    window.history.pushState(window.history.state, "", window.location.href);
    const onPop = () => {
      window.history.pushState(window.history.state, "", window.location.href);
      setConfirmExit(true);
    };

    const onPageHide = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (storageKey) removeSession(storageKey);
      const r = latestResultsRef.current();
      navigator.sendBeacon(
        "/api/quiz/result",
        new Blob(
          [
            JSON.stringify({
              idChapter,
              score: ((r.score * r.totalQuestions) / 100).toFixed(2),
              timePass: formatTime(r.timeSpent),
              sumQuestions: r.totalQuestions,
              dateOfQuiz: new Date().toLocaleDateString("en-GB"),
            }),
          ],
          { type: "application/json" },
        ),
      );
    };

    document.addEventListener("pointerdown", block, true);
    document.addEventListener("mousedown", block, true);
    document.addEventListener("click", ask, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("popstate", onPop);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("pointerdown", block, true);
      document.removeEventListener("mousedown", block, true);
      document.removeEventListener("click", ask, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [locked, idChapter, storageKey]);

  useEffect(() => {
    if (score > 0) {
      setAnimateStar(true);
      const t = setTimeout(() => setAnimateStar(false), 600);
      return () => clearTimeout(t);
    }
  }, [score]);

  const currentQ: Question | undefined = questions?.[currentQuestion - 1];


  const handleAnswer = useCallback((ans: string) => {
    if (!isSubmitted) setSelectedAnswer(ans);
  }, [isSubmitted]);

  const handleContinue = () => {
    if (!currentQ) return;
    setSelectedAnswer("");
    setShowExplanation(false);
    setIsSubmitted(false);
    setAllFillBlanksFilled(false);
    setAllFillBlanksDropFilled(false);
    setShowNoAnswerWarning(false);

    if (currentQuestion >= questionCount) {
      finishedRef.current = true;
      if (storageKey) removeSession(storageKey);
      const results: QuizResults = {
        attemptId,
        score: (score / questionCount) * 100,
        totalQuestions: questionCount,
        correctAnswers: score,
        timeSpent,
        timeSpentFormatted: formatTime(timeSpent), // Add formatted time
      };
      setQuizCompleted(true);
      onQuizComplete(results);
    } else {
      setCurrentQuestion((q) => q + 1);
    }
  };

  const renderQuestionType = (q: Question) => {
    const commonProps = {
      question: q,
      selectedAnswer,
      showExplanation,
      correctAnswer: q.correctAnswer,
      onAnswer: handleAnswer,
      showNoAnswerWarning,
      isSubmitted,
    };

    switch (q.questionNumber) {
      case 1:
        return (
          <FillBlanks
            {...commonProps}
            onAllAnswersFilled={setAllFillBlanksFilled}
          />
        );
      case 2:
        return (
          <TrueFalse
            {...commonProps}
            onCloseExplanation={() => setShowExplanation(false)}
          />
        );
      case 3:
        return <MultipleAnswers {...commonProps} />;
      case 4:
        return (
          <MultipleChoice
            {...commonProps}
            onCloseExplanation={() => setShowExplanation(false)}
          />
        );
      case 5:
        return <Sorting {...commonProps} />;
      case 6:
        return (
          <FillBlanksDrop
            {...commonProps}
            onAllAnswersFilled={setAllFillBlanksDropFilled} // Use separate state
          />
        );
      default:
        return <></>;
    }
  };

  const handleNext = () => {
    if (!currentQ || isSubmitted) return;

    // Check if question type 6 (FillBlanksDrop) has all blanks filled
    if (currentQ.questionNumber === 6 && !allFillBlanksDropFilled) {
      setShowNoAnswerWarning(true);
      return;
    }

    if (currentQ.questionNumber === 1 && !allFillBlanksFilled) {
      setShowNoAnswerWarning(true);
      return;
    }

    if ([2, 3, 4].includes(currentQ.questionNumber) && !selectedAnswer) {
      setShowNoAnswerWarning(true);
      return;
    }

    setShowNoAnswerWarning(false);

    const isCorrect = isAnswerCorrect(currentQ, selectedAnswer);
    if (isCorrect) setScore((value) => value + 1);

    // 3. Play Sound & Update Score
    if (isCorrect) {
      playSound("correct"); // Plays excellent.mp3
    } else {
      playSound("false"); // Plays fail.mp3
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }

    setIsSubmitted(true);
    setShowExplanation(true);
  };

  const isNextButtonEnabled = () => {
    if (!currentQ) return false;

    switch (currentQ.questionNumber) {
      case 1:
        return allFillBlanksFilled;
      case 2:
      case 3:
      case 4:
        return !!selectedAnswer;
      case 5:
        return true;
      case 6:
        return allFillBlanksDropFilled; // Enable button when all blanks are filled
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex justify-center items-center bg-gray-300 dark:bg-gray-950 transition-colors duration-300">
        
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Φόρτωση ερωτήσεων...</p>
        </div>
      </div>
    );
  }

  if (error || !questions?.length || !currentQ) {
    return (
      <div className="min-h-full flex justify-center items-center text-red-600 dark:text-red-400 text-center bg-gray-300 dark:bg-gray-950 transition-colors duration-300">
        
        <div>
          <p role="alert">{error?.message || "Δεν υπάρχουν διαθέσιμες ερωτήσεις."}</p>
          <button
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg transition-colors"
            onClick={onBack}
          >
            Πίσω στην αρχή
          </button>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="min-h-full flex justify-center items-center text-center bg-gray-300 dark:bg-gray-950 transition-colors duration-300">
        
        <div>
          <div className="animate-spin h-12 w-12 border-b-2 border-green-600 dark:border-green-400 rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Επεξεργασία αποτελεσμάτων...</p>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="min-h-full flex justify-center items-center bg-gray-300 dark:bg-gray-950 transition-colors duration-300">
        
        <p className="text-gray-600 dark:text-gray-400">Φόρτωση ερωτήσεων...</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative overflow-hidden min-h-full flex justify-center items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-white to-indigo-50 dark:from-indigo-950 dark:via-gray-950 dark:to-gray-900 p-1 sm:p-2 select-none transition-colors duration-300">

      {/* Animated moving gradient (light mode) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-100 dark:opacity-0 transition-opacity duration-700 bg-[linear-gradient(120deg,#f9fafb,#f3f4f6,#e5e7eb,#d1d5db,#f9fafb)] bg-[length:300%_300%] animate-gradient-move"
      />

      {/* Animated moving gradient (dark mode) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-700 bg-[linear-gradient(120deg,#1e1b4b,#3730a3,#581c87,#020617,#1e1b4b)] bg-[length:300%_300%] animate-gradient-move"
      />

      {/* Το κουμπί για αλλαγή Theme */}
      

      <div className={`relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-black/50 border border-white dark:border-gray-800 flex flex-col w-full max-w-3xl min-h-[50dvh] sm:min-h-[400px] transition-all duration-300 ${shake ? "animate-shake" : ""}`}>
        
        <div className="px-4 pt-3">
          <button type="button" className="inline-flex items-center gap-1.5 text-sm underline text-rose-700 dark:text-rose-300" onClick={() => setConfirmExit(true)}>
            <LogOut className="size-4" />
            Τερματισμός τεστ
          </button>
          {!storageAvailable && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">Η πρόοδος δεν μπορεί να αποθηκευτεί σε αυτή τη συσκευή.</p>}
        </div>
        {/* Header with Progress Bar */}
        <div className="p-3 sm:p-6 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
          <div className="flex justify-center items-center mb-3 sm:mb-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 w-fit mx-auto px-2.5 sm:px-3 py-1 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
            <Timer className="mr-1 sm:mr-1.5 text-indigo-600 dark:text-indigo-400 animate-pulse w-5 h-5 sm:w-8 sm:h-8" />
            <span className="tabular-nums">{formatTime(timeSpent)}</span>
          </div>
          <div className="w-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 mx-auto px-2.5 sm:px-3 py-2 sm:py-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
            <div className="flex justify-between mb-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              <span>
                Ερώτηση {currentQuestion} / {questionCount}
              </span>
              <span>
                {((currentQuestion / questionCount) * 100).toFixed(1)}%
              </span>
            </div>

            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2 sm:h-3 overflow-hidden shadow-inner transition-colors">
              <div
                className="
        h-2 sm:h-3 rounded-full
        bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500
        transition-all duration-500 ease-out
        shadow-[0_0_6px_rgba(99,102,241,0.6)] dark:shadow-[0_0_6px_rgba(99,102,241,0.3)]
      "
                style={{ width: `${(currentQuestion / questionCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="grow relative overflow-hidden">
          <div
            key={currentQuestion}
            className="overflow-y-auto h-full p-3 sm:p-6 animate-in fade-in slide-in-from-right-6 duration-300 ease-out"
          >
            {renderQuestionType(currentQ)}
          </div>
        </div>

        {/* Footer Container */}
        <div className="flex flex-row justify-between items-center gap-2 sm:gap-3 p-3 sm:p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-xl transition-colors duration-300">
          {/* Score Section: Always visible, compact on mobile */}
          <div className="flex flex-row items-center gap-1.5 min-w-fit w-fit">
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 mx-auto px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
              <Star
                className={`
    text-yellow-500 fill-yellow-500 shrink-0
    ${animateStar ? "animate-triple-pulse" : ""}
  `}
                size={18}
              />

              <div className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {score}{" "}
                <span className="xs:inline">
                  {score === 1 ? "βαθμός" : "βαθμοί"}
                </span>
              </div>
            </div>
          </div>

          {/* Button Section: Compact on mobile, fixed width on desktop */}
          <button
            onClick={isSubmitted ? handleContinue : handleNext}
            disabled={!isSubmitted && !isNextButtonEnabled()}
            className={`
    px-4 sm:px-10 py-3 sm:py-4 
    text-sm sm:text-lg rounded-2xl font-black select-none transition-all
    active:scale-95 touch-manipulation
    ${
      isNextButtonEnabled()
        ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50"
        : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
    }
  `}
          >
            <div className="flex items-center gap-2">
              <span>
                {!isSubmitted ? "Έλεγχος" : currentQuestion >= questionCount ? "Ολοκλήρωση" : "Επόμενη"}{" "}
              </span>

              {isNextButtonEnabled() && (
                <div className="flex items-center justify-center transition-all duration-300">
                  {!isSubmitted && currentQuestion < questionCount ? (
                    // Checkmark for "Έλεγχος" state
                    <Check
                      size={20}
                      strokeWidth={3}
                      className="animate-in zoom-in duration-300"
                    />
                  ) : (
                    // Arrow for "Επόμενη" or "Ολοκλήρωση" state
                    <ArrowRight
                      size={20}
                      strokeWidth={3}
                      className="animate-in slide-in-from-left-2 duration-300"
                    />
                  )}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {confirmExit && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="quiz-exit-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <h2
              id="quiz-exit-title"
              className="text-lg font-bold text-gray-900 dark:text-gray-100"
            >
              Θέλεις να τερματίσεις το τεστ;
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Το τεστ δεν έχει τελειώσει. Αν το τερματίσεις, θα σταλούν τα
              αποτελέσματα μέχρι τώρα:{" "}
              <strong>
                {score} σωστές από {questionCount}
              </strong>
              . Όσες ερωτήσεις δεν απάντησες μετράνε λάθος.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmExit(false)}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
              >
                Συνέχεια τεστ
              </button>
              <button
                type="button"
                onClick={finishEarly}
                className="rounded-lg border border-rose-300 px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
              >
                Τερματισμός & αποστολή
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizScreen;