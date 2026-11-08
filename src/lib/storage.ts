// Lưu trữ tiến bộ versioned trong localStorage, có memory fallback (R4).
// Logic thuần, truy cập browser API được bảo vệ an toàn.
import type { Attempt, BestRecord, Progress } from "@/types";
import { totalScore } from "./engine";

export const STORAGE_KEY = "english-garden:progress:v1";
export const SCHEMA_VERSION = 1 as const;
export const MAX_HISTORY = 50;

export type StorageMode = "persistent" | "memory";

export interface LoadResult {
  progress: Progress;
  mode: StorageMode;
  recovered: boolean; // true nếu dữ liệu cũ hỏng/không hỗ trợ và đã phục hồi an toàn
  message?: string;
}

export function createInitialProgress(): Progress {
  return {
    schemaVersion: SCHEMA_VERSION,
    unlockedRoundIds: ["round-1"], // vòng 1 mở mặc định
    bestByRound: {},
    attempts: [],
    activeAttemptId: null,
  };
}

/** Kho lưu trữ tối giản để có thể thay bằng memory khi localStorage bị chặn. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** Trả localStorage nếu dùng được, ngược lại null (bị chặn/không có). */
export function getLocalStorageSafe(): KeyValueStore | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "__eg_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Progress>;
  return (
    p.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(p.unlockedRoundIds) &&
    typeof p.bestByRound === "object" &&
    p.bestByRound !== null &&
    Array.isArray(p.attempts) &&
    (p.activeAttemptId === null || typeof p.activeAttemptId === "string")
  );
}

/**
 * Nạp tiến bộ. Không bao giờ ném lỗi:
 * - storage bị chặn -> memory fallback, mode="memory".
 * - JSON hỏng / schema không hợp lệ / version khác -> phục hồi về mặc định an toàn.
 */
export function loadProgress(store: KeyValueStore | null): LoadResult {
  if (!store) {
    return {
      progress: createInitialProgress(),
      mode: "memory",
      recovered: false,
      message:
        "Trình duyệt không cho lưu dữ liệu. Tiến bộ chỉ giữ tạm trong phiên này.",
    };
  }

  let raw: string | null = null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return {
      progress: createInitialProgress(),
      mode: "memory",
      recovered: false,
      message: "Không đọc được bộ nhớ. Dùng chế độ bộ nhớ tạm.",
    };
  }

  if (raw === null) {
    return { progress: createInitialProgress(), mode: "persistent", recovered: false };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isValidProgress(parsed)) {
      return {
        progress: createInitialProgress(),
        mode: "persistent",
        recovered: true,
        message:
          "Dữ liệu cũ không tương thích nên đã khởi tạo lại an toàn. Thành tích cũ có thể không còn.",
      };
    }
    return { progress: parsed, mode: "persistent", recovered: false };
  } catch {
    return {
      progress: createInitialProgress(),
      mode: "persistent",
      recovered: true,
      message: "Dữ liệu lưu bị hỏng nên đã khởi tạo lại an toàn.",
    };
  }
}

/** Ghi tiến bộ. Trả về mode thực tế (có thể rơi về memory nếu ghi lỗi). */
export function saveProgress(
  store: KeyValueStore | null,
  progress: Progress
): StorageMode {
  if (!store) return "memory";
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(progress));
    return "persistent";
  } catch {
    // Quota hoặc security error -> không crash.
    return "memory";
  }
}

export function createMemoryStore(): KeyValueStore {
  return new MemoryStore();
}

// ---- Thao tác thuần trên Progress (reducer-style, không side effect) ----

/** Giữ tối đa MAX_HISTORY lượt gần nhất (theo startedAtMs). */
function boundHistory(attempts: Attempt[]): Attempt[] {
  if (attempts.length <= MAX_HISTORY) return attempts;
  return [...attempts]
    .sort((a, b) => b.startedAtMs - a.startedAtMs)
    .slice(0, MAX_HISTORY);
}

/** Thêm/cập nhật một lượt vào tiến bộ (ghi đè theo id). */
export function upsertAttempt(progress: Progress, attempt: Attempt): Progress {
  const others = progress.attempts.filter((a) => a.id !== attempt.id);
  return {
    ...progress,
    attempts: boundHistory([attempt, ...others]),
  };
}

export function setActiveAttempt(
  progress: Progress,
  attemptId: string | null
): Progress {
  return { ...progress, activeAttemptId: attemptId };
}

/** best ưu tiên điểm cao, rồi thời gian ngắn. */
function isBetter(candidate: BestRecord, current?: BestRecord): boolean {
  if (!current) return true;
  if (candidate.score !== current.score) return candidate.score > current.score;
  return candidate.timeMs < current.timeMs;
}

/**
 * Hoàn tất một lượt vòng: cập nhật best (atomically), mở khoá vòng kế nếu ≥150,
 * lưu lịch sử, và reset activeAttemptId. Không khoá lại vòng khi làm lại điểm thấp.
 */
export function finalizeRoundAttempt(
  progress: Progress,
  attempt: Attempt,
  nextRoundId?: string
): Progress {
  let next = upsertAttempt(progress, attempt);
  next = setActiveAttempt(next, null);

  if (attempt.mode !== "round" || !attempt.roundId) return next;

  const score = totalScore(attempt);
  const timeMs =
    (attempt.endedAtMs ?? attempt.startedAtMs) - attempt.startedAtMs;
  const candidate: BestRecord = {
    score,
    timeMs,
    achievedAtMs: attempt.endedAtMs ?? attempt.startedAtMs,
  };

  const bestByRound = { ...next.bestByRound };
  if (isBetter(candidate, bestByRound[attempt.roundId])) {
    bestByRound[attempt.roundId] = candidate;
  }

  const unlocked = new Set(next.unlockedRoundIds);
  if (score >= 150 && nextRoundId) unlocked.add(nextRoundId);

  return {
    ...next,
    bestByRound,
    unlockedRoundIds: Array.from(unlocked),
  };
}

export function isRoundUnlocked(progress: Progress, roundId: string): boolean {
  return progress.unlockedRoundIds.includes(roundId);
}

/** Xoá toàn bộ dữ liệu ứng dụng và về trạng thái ban đầu. */
export function clearAll(store: KeyValueStore | null): Progress {
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      // bỏ qua: vẫn trả về trạng thái ban đầu
    }
  }
  return createInitialProgress();
}
