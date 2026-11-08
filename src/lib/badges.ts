// Huy hiệu tính thuần từ Progress (R6). Chỉ trên thiết bị, không có bảng toàn quốc.
import type { Progress } from "@/types";
import { ROUNDS } from "@/data";
import { MAX_ROUND_SCORE } from "./engine";

export interface Badge {
  id: string;
  titleVi: string;
  descriptionVi: string;
  earned: boolean;
}

export function computeBadges(progress: Progress): Badge[] {
  const bests = Object.values(progress.bestByRound);
  const passedCount = bests.filter((b) => b.score >= 150).length;
  const perfectCount = bests.filter((b) => b.score >= MAX_ROUND_SCORE).length;
  const unlockedCount = progress.unlockedRoundIds.length;
  const attemptCount = progress.attempts.length;

  return [
    {
      id: "first-step",
      titleVi: "Mầm xanh",
      descriptionVi: "Hoàn thành lượt chơi đầu tiên.",
      earned: attemptCount >= 1,
    },
    {
      id: "first-pass",
      titleVi: "Nụ hoa",
      descriptionVi: "Đạt từ 150 điểm ở một vòng.",
      earned: passedCount >= 1,
    },
    {
      id: "three-pass",
      titleVi: "Khóm hoa",
      descriptionVi: "Qua được 3 vòng.",
      earned: passedCount >= 3,
    },
    {
      id: "half-garden",
      titleVi: "Vườn nhỏ",
      descriptionVi: "Mở khóa ít nhất 4 vòng.",
      earned: unlockedCount >= 4,
    },
    {
      id: "perfect",
      titleVi: "Hoa vàng rực rỡ",
      descriptionVi: `Đạt điểm tuyệt đối ${MAX_ROUND_SCORE} ở một vòng.`,
      earned: perfectCount >= 1,
    },
    {
      id: "all-rounds",
      titleVi: "Vườn nở rộ",
      descriptionVi: "Mở khóa toàn bộ các vòng.",
      earned: unlockedCount >= ROUNDS.length,
    },
  ];
}

/** Bảng thành tích local: các vòng đã có best, sắp theo điểm giảm dần rồi thời gian. */
export function leaderboardRows(progress: Progress): Array<{
  roundId: string;
  score: number;
  timeMs: number;
}> {
  return Object.entries(progress.bestByRound)
    .map(([roundId, best]) => ({
      roundId,
      score: best.score,
      timeMs: best.timeMs,
    }))
    .sort((a, b) => b.score - a.score || a.timeMs - b.timeMs);
}
