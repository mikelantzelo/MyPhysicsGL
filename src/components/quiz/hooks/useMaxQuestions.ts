"use client";

import { useQuery } from "@tanstack/react-query";

import { getQuizInfo } from "@/app/quiz-actions";

/** Πόσες ερωτήσεις έχει η παράγραφος (μοιράζεται το query με το useParagraph). */
export const useMaxQuestions = (idChapter: string | null) => {
  return useQuery({
    queryKey: ["quiz-info", idChapter],
    enabled: !!idChapter,
    queryFn: () => getQuizInfo(idChapter!),
    select: (info) => info.maxQuestions,
  });
};
