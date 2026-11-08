// Nạp ngân hàng câu hỏi và các vòng từ JSON cục bộ.
import type { Question, Round } from "@/types";
import questionsJson from "./questions.json";
import roundsJson from "./rounds.json";

export const QUESTIONS = questionsJson as unknown as Question[];
export const ROUNDS = roundsJson as unknown as Round[];

const QUESTION_MAP = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return QUESTION_MAP.get(id);
}

export function getRound(id: string): Round | undefined {
  return ROUNDS.find((r) => r.id === id);
}

export function getQuestionsForRound(roundId: string): Question[] {
  const round = getRound(roundId);
  if (!round) return [];
  return round.questionIds
    .map((qid) => QUESTION_MAP.get(qid))
    .filter((q): q is Question => Boolean(q));
}

export function getQuestionsByTopic(topic: string): Question[] {
  return QUESTIONS.filter((q) => q.topic === topic);
}
