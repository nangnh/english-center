// Engine/reducer thuần cho một lượt chơi (R3). Không phụ thuộc React.
import type {
  Answer,
  Attempt,
  PlayMode,
  Question,
  Topic,
} from "@/types";
import { evaluate } from "./scoring";

export const ROUND_DURATION_SECONDS = 1800; // 30 phút
export const ROUND_QUESTION_COUNT = 20;
export const STAGE_SIZE = 5;
export const MAX_ROUND_SCORE = 200;
export const PASS_SCORE = 150;

export interface StartRoundInput {
  id: string;
  mode: PlayMode;
  roundId?: string;
  topic?: Topic;
  questionIds: string[];
  nowMs: number;
}

/** Khởi tạo một lượt. Chế độ vòng có deadline 30 phút; luyện nhanh không giới hạn giờ. */
export function createAttempt(input: StartRoundInput): Attempt {
  const isRound = input.mode === "round";
  return {
    id: input.id,
    mode: input.mode,
    roundId: input.roundId,
    topic: input.topic,
    questionIds: [...input.questionIds],
    answersById: {},
    evaluationsById: {},
    currentIndex: 0,
    startedAtMs: input.nowMs,
    deadlineMs: isRound
      ? input.nowMs + ROUND_DURATION_SECONDS * 1000
      : undefined,
    endedAtMs: undefined,
    status: "playing",
    audioFallbackIds: [],
  };
}

export type EngineAction =
  | { type: "SUBMIT_ANSWER"; questionId: string; answer: Answer; question: Question }
  | { type: "NEXT" }
  | { type: "GOTO"; index: number }
  | { type: "USE_AUDIO_FALLBACK"; questionId: string }
  | { type: "FINISH"; nowMs: number }
  | { type: "TICK"; nowMs: number }; // kiểm tra hết giờ

export function totalScore(attempt: Attempt): number {
  return Object.values(attempt.evaluationsById).reduce(
    (sum, e) => sum + e.score,
    0
  );
}

export function answeredCount(attempt: Attempt): number {
  return Object.keys(attempt.evaluationsById).length;
}

/** Chặng hiện tại (0-based) dựa trên currentIndex. */
export function currentStage(attempt: Attempt): number {
  return Math.floor(attempt.currentIndex / STAGE_SIZE);
}

export function isExpired(attempt: Attempt, nowMs: number): boolean {
  return (
    attempt.deadlineMs !== undefined && nowMs >= attempt.deadlineMs
  );
}

function finishAttempt(attempt: Attempt, nowMs: number): Attempt {
  // Idempotent: chỉ kết thúc một lần.
  if (attempt.status === "finished") return attempt;
  return {
    ...attempt,
    status: "finished",
    endedAtMs: nowMs,
    currentIndex: attempt.questionIds.length,
  };
}

export function engineReducer(attempt: Attempt, action: EngineAction): Attempt {
  switch (action.type) {
    case "SUBMIT_ANSWER": {
      if (attempt.status !== "playing") return attempt;
      // Khoá đáp án: không cho nộp lại câu đã chấm (nộp trùng không cộng điểm).
      if (attempt.evaluationsById[action.questionId]) return attempt;
      if (!attempt.questionIds.includes(action.questionId)) return attempt;

      const evaluation = evaluate(action.question, action.answer);
      return {
        ...attempt,
        answersById: {
          ...attempt.answersById,
          [action.questionId]: action.answer,
        },
        evaluationsById: {
          ...attempt.evaluationsById,
          [action.questionId]: evaluation,
        },
      };
    }

    case "NEXT": {
      if (attempt.status !== "playing") return attempt;
      const nextIndex = attempt.currentIndex + 1;
      if (nextIndex >= attempt.questionIds.length) {
        // Hết câu -> không tự kết thúc ở đây; trang gọi FINISH tường minh.
        return { ...attempt, currentIndex: attempt.questionIds.length - 1 };
      }
      return { ...attempt, currentIndex: nextIndex };
    }

    case "GOTO": {
      if (attempt.status !== "playing") return attempt;
      const idx = Math.max(
        0,
        Math.min(action.index, attempt.questionIds.length - 1)
      );
      return { ...attempt, currentIndex: idx };
    }

    case "USE_AUDIO_FALLBACK": {
      if (attempt.audioFallbackIds.includes(action.questionId)) return attempt;
      return {
        ...attempt,
        audioFallbackIds: [...attempt.audioFallbackIds, action.questionId],
      };
    }

    case "TICK": {
      if (attempt.status !== "playing") return attempt;
      if (isExpired(attempt, action.nowMs)) {
        return finishAttempt(attempt, action.nowMs);
      }
      return attempt;
    }

    case "FINISH": {
      return finishAttempt(attempt, action.nowMs);
    }

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return attempt;
    }
  }
}

/** Số giây còn lại, không âm; dùng deadline tuyệt đối. */
export function remainingSeconds(attempt: Attempt, nowMs: number): number {
  if (attempt.deadlineMs === undefined) return Infinity;
  return Math.ceil(Math.max(0, attempt.deadlineMs - nowMs) / 1000);
}

/** Lượt có đạt ngưỡng mở khoá vòng kế (chỉ áp dụng chế độ vòng). */
export function isPass(attempt: Attempt): boolean {
  return attempt.mode === "round" && totalScore(attempt) >= PASS_SCORE;
}
