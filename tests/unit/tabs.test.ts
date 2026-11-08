import { describe, it, expect } from "vitest";
import {
  canOwn,
  parseLock,
  serializeLock,
  makeOwnerToken,
  LOCK_STALE_MS,
  type TabLock,
} from "@/lib/tabs";
import {
  createAttempt,
  engineReducer,
  remainingSeconds,
} from "@/lib/engine";

describe("đa tab lock (R4)", () => {
  const now = 1_000_000;
  const mine = "tab-A";

  it("không có lock -> được sở hữu", () => {
    expect(canOwn(null, mine, "att1", now)).toBe(true);
  });

  it("lock của chính mình -> được sở hữu", () => {
    const lock: TabLock = { attemptId: "att1", ownerToken: mine, updatedAtMs: now };
    expect(canOwn(lock, mine, "att1", now)).toBe(true);
  });

  it("lock tab khác còn mới -> KHÔNG được chấm cùng lượt", () => {
    const lock: TabLock = { attemptId: "att1", ownerToken: "tab-B", updatedAtMs: now };
    expect(canOwn(lock, mine, "att1", now + 1000)).toBe(false);
  });

  it("lock tab khác đã cũ (stale) -> được chiếm", () => {
    const lock: TabLock = { attemptId: "att1", ownerToken: "tab-B", updatedAtMs: now };
    expect(canOwn(lock, mine, "att1", now + LOCK_STALE_MS + 1)).toBe(true);
  });

  it("lock cho lượt khác -> không tranh chấp", () => {
    const lock: TabLock = { attemptId: "other", ownerToken: "tab-B", updatedAtMs: now };
    expect(canOwn(lock, mine, "att1", now)).toBe(true);
  });

  it("serialize/parse round-trip; parse rác trả null", () => {
    const lock: TabLock = { attemptId: "att1", ownerToken: makeOwnerToken(), updatedAtMs: now };
    expect(parseLock(serializeLock(lock))).toEqual(lock);
    expect(parseLock("rac-khong-parse-duoc")).toBeNull();
    expect(parseLock(null)).toBeNull();
  });
});

describe("resume theo deadline tuyệt đối (R4)", () => {
  const T0 = 5_000_000;
  const ids = Array.from({ length: 20 }, (_, i) => `q${i + 1}`);

  it("reload giữa chừng: thời gian còn lại tính từ deadline, không reset 30 phút", () => {
    const a = createAttempt({ id: "a", mode: "round", roundId: "round-1", questionIds: ids, nowMs: T0 });
    // "reload" sau 10 phút: còn 20 phút = 1200s
    expect(remainingSeconds(a, T0 + 10 * 60 * 1000)).toBe(1200);
  });

  it("reload khi đã quá hạn -> TICK kết thúc đúng một lần", () => {
    let a = createAttempt({ id: "a", mode: "round", roundId: "round-1", questionIds: ids, nowMs: T0 });
    const afterDeadline = a.deadlineMs! + 60_000;
    a = engineReducer(a, { type: "TICK", nowMs: afterDeadline });
    expect(a.status).toBe("finished");
    expect(a.endedAtMs).toBe(afterDeadline);
  });
});
