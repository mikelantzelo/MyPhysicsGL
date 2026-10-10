"use client";

import { useQuery } from "@tanstack/react-query";

import { getQuizQuestions } from "@/app/quiz-actions";
import { normalizeQuestions } from "@/components/quiz/lib/questions";
import type { Question } from "@/components/quiz/lib/questions";
export type { Question } from "@/components/quiz/lib/questions";

export const useQuestions = (
  idChapter: string | null,
  questionCount: number,
  savedQuestions?: Question[],
  attemptId?: string,
) => {
  return useQuery({
    queryKey: ["questions", idChapter, questionCount, attemptId],
    initialData: savedQuestions,
    queryFn: async (): Promise<Question[]> => {
      if (!idChapter) throw new Error("idChapter is required");
      const rows = await getQuizQuestions(idChapter, questionCount);
      return normalizeQuestions(rows, questionCount);
    },
    enabled: !!idChapter && questionCount > 0,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnReconnect: false,
  });
};
