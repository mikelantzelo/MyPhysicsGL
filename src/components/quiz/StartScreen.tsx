"use client";

import { attemptKey, readAttempt, setAttemptOwner } from "@/components/quiz/lib/attempt";
import { removeSession } from "@/components/quiz/lib/storage";
import { PendingResults } from "./PendingResults";
import { Slider } from "@/components/quiz/ui/slider";
import { useMaxQuestions } from "@/components/quiz/hooks/useMaxQuestions";
import { useState, useEffect } from "react";
import { Loader2, Rocket, Timer, Trophy, HelpCircle, RefreshCcw } from "lucide-react";
import { useParagraph } from "@/components/quiz/hooks/useParagraph";


interface StartScreenProps {
  idStudent: number;
  idChapter: string;
  onStartQuiz: (questionCount: number) => void;
}

function StartScreen({ idStudent, idChapter, onStartQuiz }: StartScreenProps) {
  const savedAttempt = readAttempt(attemptKey(idStudent, idChapter));
  useEffect(() => { setAttemptOwner(idStudent, idChapter); }, [idStudent, idChapter]);
  const [sliderValue, setSliderValue] = useState<number[]>([1]);

  const {
    data: maxQuestions,
    isLoading,
    error,
  } = useMaxQuestions(idChapter);

  const {
    data: paragraph2,
    isLoading: isLoading2,
    error: error2,
  } = useParagraph(idChapter);


  useEffect(() => {
    if (maxQuestions && maxQuestions > 0) {
      setSliderValue([Math.min(5, maxQuestions)]);
    }
  }, [maxQuestions]);

  const canStart = !!maxQuestions && sliderValue[0] >= 1 && sliderValue[0] <= maxQuestions;
  const handleStart = () => {
    if (!canStart) return;
    if (savedAttempt && !window.confirm("Να ξεκινήσει νέα προσπάθεια και να διαγραφεί η προηγούμενη πρόοδος;")) return;
    removeSession(attemptKey(idStudent, idChapter));
    setAttemptOwner(idStudent, idChapter);
    onStartQuiz(sliderValue[0]);
  };
  const resume = savedAttempt && <button type="button" className="block w-full rounded-xl p-4 mb-4 bg-indigo-600 text-white font-bold" onClick={() => {
    setAttemptOwner(idStudent, idChapter);
    onStartQuiz(savedAttempt.questionCount);
  }}>Συνέχεια προσπάθειας — ερώτηση {savedAttempt.currentQuestion} / {savedAttempt.questionCount}</button>;

  if (isLoading || isLoading2) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-indigo-50 dark:bg-gray-950 text-indigo-600 dark:text-indigo-400 gap-4 transition-colors">
        
        {resume}
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="font-medium text-sm animate-pulse">Ετοιμάζω τις ερωτήσεις σου...</p>
      </div>
    );
  }

  if (error || error2) {
    return (
      <div className="min-h-full flex items-center justify-center bg-red-50 dark:bg-gray-950 p-6 transition-colors">
        
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-transparent dark:border-gray-800">
          <div className="bg-red-100 dark:bg-red-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCcw className="text-red-500 dark:text-red-400 w-7 h-7" />
          </div>
          {resume}
          <PendingResults idStudent={idStudent} idChapter={idChapter} />
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Κάτι πήγε στραβά!</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Δεν μπόρεσα να φορτώσω το μάθημα.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            Δοκίμασε ξανά
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="select-none min-h-full flex items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-50 to-pink-100 dark:from-indigo-950 dark:via-gray-900 dark:to-purple-950 px-4 py-8 transition-colors duration-500">

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

      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-300 dark:bg-purple-900/30 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-40 -right-20 w-80 h-80 bg-pink-300 dark:bg-pink-900/30 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-40 w-96 h-96 bg-indigo-300 dark:bg-indigo-900/30 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="absolute top-4 right-4 z-50">
        
      </div>

      <div className="relative z-10 w-full max-w-[420px] md:max-w-3xl lg:max-w-4xl">
        <PendingResults idStudent={idStudent} idChapter={idChapter} />
        {resume}
        {/* Main Card */}
        <div className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/50 dark:border-white/10 overflow-hidden transition-all duration-300 md:flex md:flex-row">
          
          {/* Vibrant Top Section */}
          <div className="relative bg-linear-to-br from-indigo-600 via-purple-600 to-pink-500 p-5 sm:p-8 flex flex-col items-center justify-center text-center overflow-hidden md:w-1/2 md:p-12">
            {/* Subtle overlay pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent mix-blend-overlay"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white/20 p-3 sm:p-4 md:p-6 rounded-3xl backdrop-blur-md shadow-inner border border-white/20 mb-4 animate-pop">
                <img
                  src="/quiz/images/quiz_time.png"
                  alt="Quiz Time"
                  className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 object-contain drop-shadow-xl"
                />
              </div>

              <h1 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-3 md:mb-5 drop-shadow-md wrap-break-word">
                {paragraph2?.title || "Το Κουίζ Σου"}
              </h1>
              
              <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Ετοιμος/η;
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 sm:p-8 flex flex-col gap-6 md:w-1/2 md:justify-center">
            
            {/* Stats Row with new modern styling */}
            <div className="grid grid-cols-3 gap-3">
              <div className="group flex flex-col items-center justify-center bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-2xl py-3 px-1 border border-white/60 dark:border-white/5 transition-all duration-300 shadow-sm hover:shadow-md">
                <HelpCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xl md:text-2xl font-black text-slate-700 dark:text-gray-200">{maxQuestions ?? 0}</span>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Ερωτήσεις</span>
              </div>
              
              <div className="group flex flex-col items-center justify-center bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-2xl py-3 px-1 border border-white/60 dark:border-white/5 transition-all duration-300 shadow-sm hover:shadow-md">
                <Timer className="w-5 h-5 text-pink-500 dark:text-pink-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xl md:text-2xl font-black text-slate-700 dark:text-gray-200">∞</span>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Χρόνος</span>
              </div>
              
              <div className="group flex flex-col items-center justify-center bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-2xl py-3 px-1 border border-white/60 dark:border-white/5 transition-all duration-300 shadow-sm hover:shadow-md">
                <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xl md:text-2xl font-black text-slate-700 dark:text-gray-200">{maxQuestions}</span>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">Μέγιστο</span>
              </div>
            </div>

            {/* Interactive Slider Section */}
            <div className="bg-gradient-to-b from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-900/10 rounded-3xl p-5 border border-indigo-100/50 dark:border-indigo-500/10">
              <div className="flex justify-between items-end mb-4">
                <p className="text-slate-600 dark:text-slate-300 font-bold text-sm leading-tight max-w-[150px]">
                  Πόσες ερωτήσεις θέλεις σήμερα;
                </p>
                <div className="flex items-baseline gap-1 text-indigo-600 dark:text-indigo-400 bg-white/80 dark:bg-black/20 px-3 py-1 rounded-xl shadow-xs">
                  <span className="text-2xl font-black">{sliderValue[0]}</span>
                  <span className="text-xs font-bold opacity-60">/ {maxQuestions}</span>
                </div>
              </div>
              
              <div className="px-1 py-2">
                <Slider
                  aria-label="Αριθμός ερωτήσεων"
                  disabled={!maxQuestions}
                  max={Math.max(1, maxQuestions ?? 1)}
                  min={1}
                  step={1}
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  className="cursor-pointer"
                />
              </div>
            </div>

            {maxQuestions === 0 && <p role="status" className="text-center text-slate-700 dark:text-slate-200">Δεν υπάρχουν διαθέσιμες ερωτήσεις για αυτό το μάθημα.</p>}
            {/* Play Button */}
            <button
              disabled={!canStart}
              onClick={handleStart}
              className="group relative w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-indigo-500 hover:bg-slate-800 dark:hover:bg-indigo-400 text-white font-black text-lg sm:text-xl py-4 sm:py-5 rounded-[2rem] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden mt-2 touch-manipulation"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              
              <Rocket className="w-6 h-6 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300 text-indigo-300 dark:text-white" />
              <span>ΞΕΚΙΝΑ ΤΟ QUIZ</span>
            </button>
            
          </div>
        </div>
        
        {/* Bottom helper text */}
        <p className="text-center mt-6 text-slate-500/70 dark:text-slate-400/50 text-xs font-medium px-8 md:text-sm">
          Μπορείς να επαναλάβεις το quiz όσες φορές θες για να τελειοποιήσεις το σκορ σου!
        </p>
      </div>
    </div>
  );
}

export default StartScreen;