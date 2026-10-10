"use client";

import { useQuery } from "@tanstack/react-query";

import { getQuizInfo } from "@/app/quiz-actions";

/** Ο τίτλος της παραγράφου για την αρχική οθόνη του quiz. */
export const useParagraph = (idChapter: string | null) => {
  return useQuery({
    queryKey: ["quiz-info", idChapter],
    enabled: !!idChapter,
    queryFn: () => getQuizInfo(idChapter!),
  });
};
