// Tạo lượt chơi từ dữ liệu (thuần, dùng chung client/test).
import type { Attempt, PlayMode, Topic } from "@/types";
import { ROUNDS, QUESTIONS, getRound } from "@/data";
import { createAttempt } from "./engine";

export interface ResolvedPlay {
  mode: PlayMode;
  roundId?: string;
  topic?: Topic;
  questionIds: string[];
  titleVi: string;
}

/**
 * Giải mã tham số route thành cấu hình lượt:
 * - "round-3" -> vòng.
 * - "quick-animals" -> luyện nhanh 5 câu chủ đề animals.
 */
export function resolvePlayParam(param: string): ResolvedPlay | null {
  if (param.startsWith("quick-")) {
    const topic = param.slice("quick-".length) as Topic;
    const pool = QUESTIONS.filter((q) => q.topic === topic);
    if (pool.length === 0) return null;
    const picked = pickQuick(pool.map((q) => q.id), 5, param);
    return {
      mode: "quick",
      topic,
      questionIds: picked,
      titleVi: "Luyện nhanh",
    };
  }

  const round = getRound(param);
  if (round) {
    return {
      mode: "round",
      roundId: round.id,
      questionIds: round.questionIds,
      titleVi: round.titleVi,
    };
  }
  return null;
}

/** Chọn n câu ổn định (không random mỗi render) bằng seed từ param. */
export function pickQuick(ids: string[], n: number, seed: string): string[] {
  if (ids.length <= n) return [...ids];
  // Hash đơn giản từ seed để chọn điểm bắt đầu khác nhau theo chủ đề,
  // nhưng ổn định trong cùng một lần mở.
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const start = Math.abs(h) % ids.length;
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) out.push(ids[(start + i) % ids.length]);
  return out;
}

export function nextRoundIdOf(roundId: string): string | undefined {
  const idx = ROUNDS.findIndex((r) => r.id === roundId);
  if (idx === -1 || idx + 1 >= ROUNDS.length) return undefined;
  return ROUNDS[idx + 1].id;
}

export function newAttemptId(): string {
  return `att-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function buildAttempt(resolved: ResolvedPlay, nowMs: number): Attempt {
  return createAttempt({
    id: newAttemptId(),
    mode: resolved.mode,
    roundId: resolved.roundId,
    topic: resolved.topic,
    questionIds: resolved.questionIds,
    nowMs,
  });
}
