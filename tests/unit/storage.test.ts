import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialProgress,
  createMemoryStore,
  loadProgress,
  saveProgress,
  upsertAttempt,
  finalizeRoundAttempt,
  isRoundUnlocked,
  clearAll,
  STORAGE_KEY,
  MAX_HISTORY,
  type KeyValueStore,
} from "@/lib/storage";
import type { Attempt } from "@/types";

function makeAttempt(partial: Partial<Attempt> & { id: string }): Attempt {
  return {
    id: partial.id,
    mode: partial.mode ?? "round",
    roundId: partial.roundId ?? "round-1",
    questionIds: partial.questionIds ?? ["q1"],
    answersById: partial.answersById ?? {},
    evaluationsById: partial.evaluationsById ?? {},
    currentIndex: partial.currentIndex ?? 0,
    startedAtMs: partial.startedAtMs ?? 1000,
    deadlineMs: partial.deadlineMs,
    endedAtMs: partial.endedAtMs,
    status: partial.status ?? "finished",
    audioFallbackIds: partial.audioFallbackIds ?? [],
  };
}

function evalsWithScore(score: number): Record<string, { correct: boolean; score: number }> {
  const n = score / 10;
  const out: Record<string, { correct: boolean; score: number }> = {};
  for (let i = 0; i < n; i += 1) out[`q${i}`] = { correct: true, score: 10 };
  return out;
}

describe("storage versioned + fallback (R4)", () => {
  let store: KeyValueStore;
  beforeEach(() => {
    store = createMemoryStore();
  });

  it("lần đầu nạp trả về mặc định, vòng 1 đã mở", () => {
    const res = loadProgress(store);
    expect(res.mode).toBe("persistent");
    expect(res.recovered).toBe(false);
    expect(res.progress.unlockedRoundIds).toEqual(["round-1"]);
    expect(isRoundUnlocked(res.progress, "round-1")).toBe(true);
    expect(isRoundUnlocked(res.progress, "round-2")).toBe(false);
  });

  it("ghi rồi nạp lại giữ nguyên dữ liệu", () => {
    const p = createInitialProgress();
    p.unlockedRoundIds = ["round-1", "round-2"];
    saveProgress(store, p);
    const res = loadProgress(store);
    expect(res.progress.unlockedRoundIds).toEqual(["round-1", "round-2"]);
  });

  it("storage null -> memory fallback, không crash", () => {
    const res = loadProgress(null);
    expect(res.mode).toBe("memory");
    expect(res.progress.unlockedRoundIds).toEqual(["round-1"]);
    expect(saveProgress(null, res.progress)).toBe("memory");
  });

  it("JSON hỏng -> phục hồi an toàn, có thông báo", () => {
    store.setItem(STORAGE_KEY, "{ khong-phai-json");
    const res = loadProgress(store);
    expect(res.recovered).toBe(true);
    expect(res.message).toBeTruthy();
    expect(res.progress.unlockedRoundIds).toEqual(["round-1"]);
  });

  it("schema version khác -> phục hồi an toàn", () => {
    store.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, unlockedRoundIds: [], bestByRound: {}, attempts: [], activeAttemptId: null })
    );
    const res = loadProgress(store);
    expect(res.recovered).toBe(true);
    expect(res.progress.schemaVersion).toBe(1);
  });

  it("ghi lỗi (setItem ném) -> trả memory, không crash", () => {
    const failing: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {},
    };
    expect(saveProgress(failing, createInitialProgress())).toBe("memory");
  });

  it("lịch sử giới hạn 50 lượt gần nhất", () => {
    let p = createInitialProgress();
    for (let i = 0; i < 60; i += 1) {
      p = upsertAttempt(p, makeAttempt({ id: `a${i}`, startedAtMs: i }));
    }
    expect(p.attempts.length).toBe(MAX_HISTORY);
    // giữ lượt mới nhất (startedAtMs lớn nhất)
    const ids = p.attempts.map((a) => a.startedAtMs).sort((x, y) => x - y);
    expect(ids[0]).toBe(60 - MAX_HISTORY); // 10
    expect(Math.max(...ids)).toBe(59);
  });

  it("đạt ≥150 mở vòng kế; best lưu, active reset", () => {
    let p = createInitialProgress();
    const a = makeAttempt({
      id: "win",
      roundId: "round-1",
      startedAtMs: 0,
      endedAtMs: 60_000,
      evaluationsById: evalsWithScore(150),
    });
    p = finalizeRoundAttempt(p, a, "round-2");
    expect(p.unlockedRoundIds).toContain("round-2");
    expect(p.bestByRound["round-1"].score).toBe(150);
    expect(p.activeAttemptId).toBeNull();
  });

  it("dưới 150 không mở vòng kế", () => {
    let p = createInitialProgress();
    const a = makeAttempt({
      id: "lose",
      roundId: "round-1",
      endedAtMs: 10_000,
      evaluationsById: evalsWithScore(140),
    });
    p = finalizeRoundAttempt(p, a, "round-2");
    expect(p.unlockedRoundIds).not.toContain("round-2");
    expect(p.bestByRound["round-1"].score).toBe(140);
  });

  it("best không bị mất khi làm lại điểm thấp; không khoá lại vòng", () => {
    let p = createInitialProgress();
    p = finalizeRoundAttempt(
      p,
      makeAttempt({ id: "high", roundId: "round-1", startedAtMs: 0, endedAtMs: 50_000, evaluationsById: evalsWithScore(200) }),
      "round-2"
    );
    expect(p.bestByRound["round-1"].score).toBe(200);
    expect(p.unlockedRoundIds).toContain("round-2");
    // Làm lại điểm thấp hơn
    p = finalizeRoundAttempt(
      p,
      makeAttempt({ id: "low", roundId: "round-1", startedAtMs: 100, endedAtMs: 120_000, evaluationsById: evalsWithScore(100) }),
      "round-2"
    );
    expect(p.bestByRound["round-1"].score).toBe(200); // giữ best cũ
    expect(p.unlockedRoundIds).toContain("round-2"); // không khoá lại
  });

  it("best phá hoà bằng thời gian ngắn hơn khi cùng điểm", () => {
    let p = createInitialProgress();
    p = finalizeRoundAttempt(
      p,
      makeAttempt({ id: "slow", roundId: "round-1", startedAtMs: 0, endedAtMs: 100_000, evaluationsById: evalsWithScore(150) })
    );
    expect(p.bestByRound["round-1"].timeMs).toBe(100_000);
    p = finalizeRoundAttempt(
      p,
      makeAttempt({ id: "fast", roundId: "round-1", startedAtMs: 0, endedAtMs: 40_000, evaluationsById: evalsWithScore(150) })
    );
    expect(p.bestByRound["round-1"].timeMs).toBe(40_000); // nhanh hơn thắng
  });

  it("clearAll xoá dữ liệu và về trạng thái ban đầu", () => {
    const p = createInitialProgress();
    p.unlockedRoundIds = ["round-1", "round-2", "round-3"];
    saveProgress(store, p);
    const cleared = clearAll(store);
    expect(cleared.unlockedRoundIds).toEqual(["round-1"]);
    expect(store.getItem(STORAGE_KEY)).toBeNull();
  });

  it("luyện nhanh không cập nhật best/unlock", () => {
    let p = createInitialProgress();
    const a = makeAttempt({
      id: "quick1",
      mode: "quick",
      roundId: undefined,
      evaluationsById: evalsWithScore(50),
    });
    p = finalizeRoundAttempt(p, a, "round-2");
    expect(p.bestByRound).toEqual({});
    expect(p.unlockedRoundIds).toEqual(["round-1"]);
    expect(p.activeAttemptId).toBeNull();
  });
});
