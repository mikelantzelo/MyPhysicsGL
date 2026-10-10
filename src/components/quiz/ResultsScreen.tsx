"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { rememberResult, sendSavedResult } from "@/components/quiz/lib/outbox";
import { formatApiTime } from "@/components/quiz/lib/time";
import { soundEnabled } from "@/components/quiz/lib/sound";
import type { QuizResults } from "./lib/types";

import {
  Trophy,
  Clock,
  Target,
  CheckCircle2,
  RotateCcw,
  Star,
  Loader2,
} from "lucide-react";

interface ResultsScreenProps {
  idStudent: number;
  idChapter: string;
  results: QuizResults;
  onBack: () => void;
}

const RETRY_INTERVAL_MS = 5000; // Retry every 5 seconds
const MAX_RETRIES = 5;

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}λ ${seconds}δ`; // Friendlier format for kids
};

function ResultsScreen({
  idStudent,
  idChapter,
  results,
  onBack,
}: ResultsScreenProps) {
  const { mutate, isPending, isSuccess, error } = useMutation({ mutationFn: sendSavedResult });
  const [attemptId] = useState(() => results.attemptId ?? crypto.randomUUID());
  const [stored, setStored] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = useMemo(
    () => ({
      idStudent,
      idChapter,
      score: ((results.score * results.totalQuestions) / 100).toFixed(2),
      timePass: formatApiTime(results.timeSpent),
      sumQuestions: results.totalQuestions,
      dateOfQuiz: new Date().toLocaleDateString("en-GB"),
    }),
    [idStudent, idChapter, results],
  );

  const entry = useMemo(() => ({ id: attemptId, payload }), [attemptId, payload]);

  useEffect(() => {
    setStored(rememberResult(entry));
    mutate(entry);
  }, [mutate, entry]);

  // Auto-retry: when there's an error and we haven't succeeded, schedule a retry
  useEffect(() => {
    if (error && !isSuccess && !isPending && retryCount < MAX_RETRIES) {
      retryTimerRef.current = setTimeout(() => {
        setRetryCount((c) => c + 1);
        mutate(entry);
      }, RETRY_INTERVAL_MS);
    }

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [error, isSuccess, isPending, mutate, entry, retryCount]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const sound = results.score >= 70 ? "/quiz/sounds/excellent.mp3" : "/quiz/sounds/fail.mp3";
    const audio = new Audio(sound);
    if (soundEnabled()) audio.play().catch(() => {});
    const stop = () => audio.pause();
    window.addEventListener("quiz-sound-change", stop);

    return () => {
      window.removeEventListener("quiz-sound-change", stop);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [results.score]);

  return (
    <div className="relative overflow-hidden select-none min-h-full flex justify-center items-center bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-200 via-slate-100 to-white dark:from-indigo-950 dark:via-gray-900 dark:to-black px-4 py-8 transition-colors duration-300">

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
      

      <div className="relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-black/50 p-4 sm:p-10 text-center w-full max-w-2xl border border-white dark:border-gray-800 transition-colors duration-300">

        {/* Header Area */}
        <div className="relative mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-gray-100 mb-6 transition-colors duration-300">
            Τέλος της προσπάθειας!
          </h1>
        </div>

        {/* Big Score Display */}
        <div className="flex flex-col items-center mb-8 sm:mb-10">
          <div className="relative">
            <img
              src={
                results.score >= 90 ? "/quiz/images/excellent.gif" :
                results.score >= 70 ? "/quiz/images/good.gif" :
                results.score >= 50 ? "/quiz/images/poor.gif" :
                "/quiz/images/fail.gif"
              }
              alt="Achievement"
              className="w-28 h-28 sm:w-44 sm:h-44 object-contain drop-shadow-2xl z-10 relative"
            />
            {results.score >= 70 && (
              <Star className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            )}
          </div>

          <div className="mt-4">
            <span className="text-4xl sm:text-6xl font-black text-indigo-600 dark:text-indigo-400 transition-colors duration-300">
              {((results.score * results.totalQuestions) / 100).toFixed(1)}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-400 dark:text-gray-500 transition-colors duration-300">
              {" "}
              / {results.totalQuestions}
            </span>
          </div>
          <p className="text-base sm:text-lg font-bold text-slate-600 dark:text-gray-300 mt-2 italic px-2 sm:px-6 uppercase tracking-tight transition-colors duration-300">
            {results.score >= 90
              ? "Αριστα — Συνεχισε ετσι! 📚"
              : results.score >= 70
                ? "Καλη προσπαθεια — Μπραβο! ✏️"
                : results.score >= 50
                  ? "Αποδοχη — Υπαρχει περιθωριο βελτιωσης. 📊"
                  : results.score >= 30
                    ? "Ανεπαρκης — Απαιτειται περισσοτερη προσπαθεια. 📉"
                    : "Αποτυχια! ⏳"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 sm:mb-10">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-2xl transition-colors duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mx-auto mb-1" />
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
              {results.correctAnswers}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase">
              Σωστες
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-900/50 p-3 rounded-2xl transition-colors duration-300">
            <Target className="w-5 h-5 text-blue-500 dark:text-blue-400 mx-auto mb-1" />
            <div className="text-xl font-black text-blue-700 dark:text-blue-400">
              {results.totalQuestions}
            </div>
            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase">
              Συνολο
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-900/50 p-3 rounded-2xl transition-colors duration-300">
            <Clock className="w-5 h-5 text-purple-500 dark:text-purple-400 mx-auto mb-1" />
            <div className="text-xl font-black text-purple-700 dark:text-purple-400">
              {formatTime(results.timeSpent)}
            </div>
            <div className="text-[10px] font-bold text-purple-600 dark:text-purple-500 uppercase">
              Χρονος
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-900/50 p-3 rounded-2xl transition-colors duration-300">
            <Trophy className="w-5 h-5 text-orange-500 dark:text-orange-400 mx-auto mb-1" />
            <div className="text-xl font-black text-orange-700 dark:text-orange-400">
              {Math.round(results.score)}%
            </div>
            <div className="text-[10px] font-bold text-orange-600 dark:text-orange-500 uppercase">
              Σκορ
            </div>
          </div>
        </div>

        {/* Retry / Back Buttons */}
        <div className="flex flex-col gap-3">
          <button
            disabled={isPending}
            onClick={onBack}
            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 font-black py-4 rounded-2xl transition-all active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            Δοκίμασε Ξανά
          </button>
        </div>

        {/* Status Messages */}
        <div className="mt-6" role="status" aria-live="polite">
          {!stored && !isSuccess && <p className="text-red-700 dark:text-red-300">Δεν είναι διαθέσιμη η τοπική αποθήκευση. Κράτησε αυτή την οθόνη ανοιχτή μέχρι να σταλούν τα αποτελέσματα.</p>}
          {/* Success */}
          {isSuccess && (
            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-5 py-3 rounded-2xl text-sm font-bold transition-colors duration-300">
              <CheckCircle2 className="w-5 h-5" />
              Ok, μπορείς να κλείσεις τώρα την οθόνη ✅
            </div>
          )}

          {/* Sending in progress */}
          {isPending && !isSuccess && (
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-5 py-3 rounded-2xl text-sm font-bold transition-colors duration-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              {retryCount === 0
                ? "Αποστολή αποτελεσμάτων..."
                : `Ξαναπροσπαθώ να στείλω τα αποτελέσματα... (προσπάθεια ${retryCount + 1})`}
            </div>
          )}

          {/* Error — waiting to auto-retry */}
          {error && !isSuccess && !isPending && retryCount < MAX_RETRIES && (
            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-5 py-3 rounded-2xl text-sm font-bold transition-colors duration-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              Περίμενε, θα ξαναπροσπαθήσω να στείλω τα αποτελέσματα...
            </div>
          )}
          {error && !isSuccess && !isPending && retryCount >= MAX_RETRIES && (
            <div className="rounded-xl border border-red-300 p-4 text-red-700 dark:text-red-300">
              <p>Η αποστολή δεν επιβεβαιώθηκε. Οι αυτόματες προσπάθειες ολοκληρώθηκαν.</p>
              {stored && <p>Τα αποτελέσματα κρατήθηκαν σε αυτή την καρτέλα για νέα αποστολή.</p>}
              <button type="button" className="font-bold underline p-3" onClick={() => { setRetryCount(0); mutate(entry); }}>Αποστολή ξανά</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsScreen;