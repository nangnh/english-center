// Chấm điểm thuần cho 5 dạng câu (R3). Không phụ thuộc React.
import type { Answer, Evaluation, Question } from "@/types";
import { assembleUnscramble, buildScrambledTiles, normalizeLetter } from "./letters";

export const CORRECT_SCORE = 10;

/** Chuẩn hoá đáp án điền: trim + lowercase, không strip ký tự tuỳ tiện. */
export function normalizeFill(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Đánh giá một câu trả lời. Trả về đúng/sai và điểm (10 hoặc 0).
 * Không trừ điểm, không thưởng tốc độ.
 */
export function evaluate(question: Question, answer: Answer | undefined): Evaluation {
  if (!answer) return { correct: false, score: 0 };

  let correct = false;

  switch (question.kind) {
    case "choice":
    case "listening-choice": {
      if (answer.kind === "choice" || answer.kind === "listening-choice") {
        correct = answer.optionId === question.correctOptionId;
      }
      break;
    }
    case "picture-choice": {
      if (answer.kind === "picture-choice") {
        correct = answer.optionId === question.correctOptionId;
      }
      break;
    }
    case "fill": {
      if (answer.kind === "fill") {
        const got = normalizeFill(answer.text);
        correct = question.acceptedAnswers.some(
          (a) => normalizeFill(a) === got
        );
      }
      break;
    }
    case "matching": {
      if (answer.kind === "matching") {
        // Đúng chỉ khi đủ cả 3 cặp nối đúng (left pairId -> right pairId).
        correct =
          question.pairs.length === 3 &&
          question.pairs.every((p) => answer.links[p.id] === p.id) &&
          Object.keys(answer.links).length === question.pairs.length;
      }
      break;
    }
    case "spell-fill": {
      if (answer.kind === "spell-fill") {
        // Đúng khi mọi vị trí khuyết được điền đúng chữ (không phân biệt hoa thường).
        correct =
          question.blankIndexes.length > 0 &&
          question.blankIndexes.every((idx) => {
            const filled = answer.letters[idx];
            if (typeof filled !== "string") return false;
            return normalizeLetter(filled) === normalizeLetter(question.answerEn[idx] ?? "");
          });
      }
      break;
    }
    case "unscramble": {
      if (answer.kind === "unscramble") {
        const tiles = buildScrambledTiles(question.answerEn, question.id);
        const assembled = assembleUnscramble(tiles, answer.order);
        correct =
          answer.order.length === question.answerEn.length &&
          normalizeLetter(assembled) === normalizeLetter(question.answerEn);
      }
      break;
    }
    default: {
      const _exhaustive: never = question;
      void _exhaustive;
    }
  }

  return { correct, score: correct ? CORRECT_SCORE : 0 };
}
