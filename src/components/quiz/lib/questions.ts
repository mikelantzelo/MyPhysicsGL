export interface Question {
  idQuestion: string;
  idChapter: string;
  questionText: string;
  imgNumber: string;
  questionImage: string;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  answerE: string;
  correctAnswer: string;
  questionNumber: number;
}

export const blankIdsFor = (text: string): string[] =>
  [...new Set([...text.matchAll(/word(\d+)/g)].map((match) => match[1]))]
    .sort((a, b) => Number(a) - Number(b));

export const answerKeys = (value: string): string[] =>
  /[,;]/.test(value) ? value.split(/[,;]/).map((key) => key.trim()) : [...value.trim()];

export function blankAnswerMap(question: Question): Record<string, string> {
  const keys = answerKeys(question.correctAnswer);
  return Object.fromEntries(blankIdsFor(question.questionText).map((id, index) => [id, keys[index] ?? ""]));
}

export function isAnswerCorrect(question: Question, selected: string): boolean {
  if (!selected) return false;
  if (question.questionNumber === 1 || question.questionNumber === 6) {
    const actual = selected.split(",");
    const expected = answerKeys(question.correctAnswer);
    return actual.length === blankIdsFor(question.questionText).length &&
      actual.length === expected.length && actual.every((key, index) => !!key && key === expected[index]);
  }
  if (question.questionNumber === 3) {
    const actual = new Set(answerKeys(selected));
    const expected = new Set(answerKeys(question.correctAnswer));
    return actual.size === expected.size && [...expected].every((key) => actual.has(key));
  }
  if (question.questionNumber === 5) {
    const actual = selected.split(";").map((key) => key.trim());
    const expected = question.correctAnswer.split(";").map((key) => key.trim());
    return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
  }
  return selected === question.correctAnswer;
}

export function normalizeQuestions(data: unknown, count?: number): Question[] {
  if (!Array.isArray(data)) throw new Error("Μη έγκυρη απάντηση ερωτήσεων από τον διακομιστή.");
  if (!data.length) throw new Error("Δεν υπάρχουν διαθέσιμες ερωτήσεις για αυτό το μάθημα.");
  if (count !== undefined && data.length !== count) throw new Error("Δεν φορτώθηκαν όλες οι ερωτήσεις. Δοκίμασε ξανά.");
  const ids = new Set<string>();
  return data.map((row: unknown) => {
    if (!row || typeof row !== "object") throw new Error("Μη έγκυρη ερώτηση.");
    const raw = row as Record<string, unknown>;
    const text = (key: string) => raw[key] == null ? "" : String(raw[key]);
    const question: Question = {
      idQuestion: text("idQuestion"), idChapter: text("idChapter"),
      questionText: text("questionText"), imgNumber: text("imgNumber"),
      questionImage: text("questionImage"), correctAnswer: text("correctAnswer").trim(),
      answerA: text("answerA"), answerB: text("answerB"), answerC: text("answerC"),
      answerD: text("answerD"), answerE: text("answerE"), questionNumber: Number(raw.questionNumber),
    };
    if (!question.idQuestion || ids.has(question.idQuestion) || !question.questionText.trim() ||
        !question.correctAnswer || ![1, 2, 3, 4, 5, 6].includes(question.questionNumber)) {
      throw new Error("Μια ερώτηση έχει ελλιπή ή μη έγκυρα στοιχεία.");
    }
    ids.add(question.idQuestion);
    if ([1, 6].includes(question.questionNumber)) {
      const blanks = blankIdsFor(question.questionText);
      const keys = answerKeys(question.correctAnswer);
      const options = [question.answerA, question.answerB, question.answerC, question.answerD, question.answerE]
        .filter(Boolean).map((answer, index) => answer.match(/^(\d+)\./)?.[1] ?? String(index + 1));
      if (!blanks.length || keys.length !== blanks.length || keys.some((key) => !options.includes(key)) ||
          (question.questionNumber === 6 && new Set(keys).size !== keys.length)) {
        throw new Error("Μη έγκυρη αντιστοίχιση απαντήσεων στα κενά.");
      }
    }
    return question;
  });
}
