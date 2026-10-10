"use client";

import "katex/dist/katex.min.css";
import "./quiz.css";

import { lazy, Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import type { QuizResults, ScreenState } from "./lib/types";

const StartScreen = lazy(() => import("./StartScreen"));
const QuizScreen = lazy(() => import("./QuizScreen"));
const ResultsScreen = lazy(() => import("./ResultsScreen"));

/**
 * Το quiz μέσα στην καρτέλα «Quiz» (πρώην ξεχωριστή εφαρμογή στο /dist/).
 * Δεν χρειάζεται πια postMessage: ο server ξέρει ποιος είναι συνδεδεμένος.
 * `idStudent` χρησιμοποιείται μόνο για τα κλειδιά της τοπικής αποθήκευσης.
 */
export default function QuizApp({
  idStudent,
  idChapter,
}: {
  idStudent: number;
  idChapter: string;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  const [currentScreen, setCurrentScreen] = useState<ScreenState>("start");
  const [questionCount, setQuestionCount] = useState(10);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);

  const backToStart = () => {
    setCurrentScreen("start");
    setQuizResults(null);
  };

  let screen: React.ReactNode;
  if (currentScreen === "quiz") {
    screen = (
      <QuizScreen
        idChapter={idChapter}
        questionCount={questionCount}
        onBack={backToStart}
        onQuizComplete={(results) => {
          setQuizResults(results);
          setCurrentScreen("results");
        }}
      />
    );
  } else if (currentScreen === "results" && quizResults) {
    screen = (
      <ResultsScreen
        idStudent={idStudent}
        idChapter={idChapter}
        results={quizResults}
        onBack={backToStart}
      />
    );
  } else {
    screen = (
      <StartScreen
        idStudent={idStudent}
        idChapter={idChapter}
        onStartQuiz={(count) => {
          setQuestionCount(count);
          setCurrentScreen("quiz");
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border [&>*]:flex-1">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-10 animate-spin text-primary" />
            </div>
          }
        >
          {screen}
        </Suspense>
      </div>
    </QueryClientProvider>
  );
}
