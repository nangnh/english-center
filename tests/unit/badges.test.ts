import { describe, it, expect } from "vitest";
import { computeBadges, leaderboardRows } from "@/lib/badges";
import { createInitialProgress } from "@/lib/storage";
import type { BestRecord, Progress } from "@/types";

function withBests(bests: Record<string, BestRecord>, unlocked?: string[]): Progress {
  const p = createInitialProgress();
  p.bestByRound = bests;
  if (unlocked) p.unlockedRoundIds = unlocked;
  p.attempts = Object.keys(bests).map((id) => ({
    id: `att-${id}`,
    mode: "round" as const,
    roundId: id,
    questionIds: [],
    answersById: {},
    evaluationsById: {},
    currentIndex: 0,
    startedAtMs: 0,
    endedAtMs: 1000,
    status: "finished" as const,
    audioFallbackIds: [],
  }));
  return p;
}

const best = (score: number, timeMs = 1000): BestRecord => ({
  score,
  timeMs,
  achievedAtMs: 0,
});

describe("huy hiệu (R6)", () => {
  it("tiến bộ rỗng: không có huy hiệu nào đạt", () => {
    const badges = computeBadges(createInitialProgress());
    expect(badges.every((b) => !b.earned)).toBe(true);
  });

  it("qua 1 vòng đạt Mầm xanh + Nụ hoa", () => {
    const p = withBests({ "round-1": best(150) });
    const badges = computeBadges(p);
    expect(badges.find((b) => b.id === "first-step")?.earned).toBe(true);
    expect(badges.find((b) => b.id === "first-pass")?.earned).toBe(true);
    expect(badges.find((b) => b.id === "three-pass")?.earned).toBe(false);
  });

  it("điểm tuyệt đối 200 đạt huy hiệu perfect", () => {
    const p = withBests({ "round-1": best(200) });
    expect(computeBadges(p).find((b) => b.id === "perfect")?.earned).toBe(true);
  });

  it("mở khóa toàn bộ vòng đạt Vườn nở rộ", () => {
    const p = withBests(
      { "round-1": best(200) },
      [
        "round-1",
        "round-2",
        "round-3",
        "round-4",
        "round-5",
        "round-6",
        "round-7",
        "round-8",
      ]
    );
    expect(computeBadges(p).find((b) => b.id === "all-rounds")?.earned).toBe(
      true
    );
    expect(computeBadges(p).find((b) => b.id === "half-garden")?.earned).toBe(
      true
    );
  });

  it("bảng thành tích sắp theo điểm giảm dần rồi thời gian tăng", () => {
    const p = withBests({
      "round-1": best(150, 90_000),
      "round-2": best(200, 120_000),
      "round-3": best(150, 60_000),
    });
    const rows = leaderboardRows(p);
    expect(rows[0].roundId).toBe("round-2"); // điểm cao nhất
    expect(rows[1].roundId).toBe("round-3"); // 150 nhưng nhanh hơn
    expect(rows[2].roundId).toBe("round-1");
  });
});
