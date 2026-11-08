// Phối hợp đa tab cho lượt đang hoạt động (R4).
// MVP: dùng owner token để một lúc chỉ một tab "sở hữu" lượt đang chấm.
// Không chống gian lận hay chỉnh đồng hồ.

export interface TabLock {
  attemptId: string;
  ownerToken: string;
  updatedAtMs: number;
}

export const LOCK_KEY = "english-garden:active-lock:v1";
// Nếu lock cũ hơn ngưỡng này coi như tab kia đã đóng (stale).
export const LOCK_STALE_MS = 15_000;

export function makeOwnerToken(): string {
  // Token ngẫu nhiên đủ dùng cho phân biệt tab, không cần bảo mật.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Quyết định tab hiện tại có được phép chấm lượt này không. */
export function canOwn(
  existing: TabLock | null,
  myToken: string,
  attemptId: string,
  nowMs: number
): boolean {
  if (!existing) return true;
  if (existing.attemptId !== attemptId) return true; // lượt khác, không tranh chấp
  if (existing.ownerToken === myToken) return true; // chính mình
  // Tab khác: chỉ chiếm nếu lock đã cũ (tab kia có thể đã đóng).
  return nowMs - existing.updatedAtMs > LOCK_STALE_MS;
}

export function parseLock(raw: string | null): TabLock | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<TabLock>;
    if (
      typeof v.attemptId === "string" &&
      typeof v.ownerToken === "string" &&
      typeof v.updatedAtMs === "number"
    ) {
      return v as TabLock;
    }
    return null;
  } catch {
    return null;
  }
}

export function serializeLock(lock: TabLock): string {
  return JSON.stringify(lock);
}
