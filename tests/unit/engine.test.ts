import { describe, it, expect } from "vitest";
import {
  createAttempt,
  engineReducer,
  totalScore,
  remainingSeconds,
  isExpired,
  isPass,
  currentStage,
  ROUND_DURATION_SECONDS,
} from "@/lib/engine";
import type { Attempt, ChoiceQuestion } from "@/types";

function q(id: string, correctId: string): ChoiceQuestion {
  return {
    id,
    kind: "choice",
    topic: "animals",
    difficulty: 1,
    promptVi: "x",
    questionEn: "x",
    options: [
      { id: "o1", textEn: "a" },
      { id: "o2", textEn: "b" },
    ],
    correctOptionId: correctId,
    explanationVi: "x",
  };
}

const T0 = 1_000_000;
const ids = Array.from({ length: 20 }, (_, i) => `q${i + 1}`);

function startRound(): Attempt {
  return createAttempt({
    id: "a1",
    mode: "round",
    roundId: "round-1",
    questionIds: ids,
    nowMs: T0,
  });
}

describe("engine lượt vòng (R3)", () => {
  it("khởi tạo 30 phút, 20 câu, 0 điểm", () => {
    const a = startRound();
    expect(a.questionIds.length).toBe(20);
    expect(totalScore(a)).toBe(0);
    expect(a.deadlineMs).toBe(T0 + ROUND_DURATION_SECONDS * 1000);
    expect(remainingSeconds(a, T0)).toBe(ROUND_DURATION_SECONDS);
    expect(a.status).toBe("playing");
  });

  it("luyện nhanh không có deadline", () => {
    const a = createAttempt({
      id: "a2",
      mode: "quick",
      questionIds: ["q1", "q2", "q3", "q4", "q5"],
      nowMs: T0,
    });
    expect(a.deadlineMs).toBeUndefined();
    expect(remainingSeconds(a, T0)).toBe(Infinity);
  });

  it("nộp đúng cộng 10, nộp trùng không cộng thêm (khoá đáp án)", () => {
    let a = startRound();
    a = engineReducer(a, {
      type: "SUBMIT_ANSWER",
      questionId: "q1",
      answer: { kind: "choice", optionId: "o1" },
      question: q("q1", "o1"),
    });
    expect(totalScore(a)).toBe(10);
    // Nộp lại cùng câu (kể cả đáp án khác) không thay đổi điểm.
    a = engineReducer(a, {
      type: "SUBMIT_ANSWER",
      questionId: "q1",
      answer: { kind: "choice", optionId: "o2" },
      question: q("q1", "o1"),
    });
    expect(totalScore(a)).toBe(10);
    expect(a.evaluationsById["q1"].correct).toBe(true);
  });

  it("điểm tối đa 200 khi đúng cả 20 câu", () => {
    let a = startRound();
    for (const id of ids) {
      a = engineReducer(a, {
        type: "SUBMIT_ANSWER",
        questionId: id,
        answer: { kind: "choice", optionId: "o1" },
        question: q(id, "o1"),
      });
    }
    expect(totalScore(a)).toBe(200);
  });

  it("chặng tính theo currentIndex (4 chặng ×5)", () => {
    let a = startRound();
    expect(currentStage(a)).toBe(0);
    a = engineReducer(a, { type: "GOTO", index: 5 });
    expect(currentStage(a)).toBe(1);
    a = engineReducer(a, { type: "GOTO", index: 19 });
    expect(currentStage(a)).toBe(3);
  });

  it("câu chưa trả lời tính 0; kết thúc hiển thị đúng tổng", () => {
    let a = startRound();
    // chỉ trả lời 15 câu đúng
    for (const id of ids.slice(0, 15)) {
      a = engineReducer(a, {
        type: "SUBMIT_ANSWER",
        questionId: id,
        answer: { kind: "choice", optionId: "o1" },
        question: q(id, "o1"),
      });
    }
    a = engineReducer(a, { type: "FINISH", nowMs: T0 + 1000 });
    expect(a.status).toBe("finished");
    expect(totalScore(a)).toBe(150); // 15×10, 5 câu bỏ trống = 0
  });

  it("FINISH idempotent: gọi hai lần không đổi endedAtMs", () => {
    let a = startRound();
    a = engineReducer(a, { type: "FINISH", nowMs: T0 + 5000 });
    const ended = a.endedAtMs;
    a = engineReducer(a, { type: "FINISH", nowMs: T0 + 9999 });
    expect(a.endedAtMs).toBe(ended);
    expect(a.status).toBe("finished");
  });

  it("hết giờ (TICK quá deadline) tự kết thúc một lần", () => {
    let a = startRound();
    expect(isExpired(a, a.deadlineMs! - 1)).toBe(false);
    a = engineReducer(a, { type: "TICK", nowMs: a.deadlineMs! });
    expect(a.status).toBe("finished");
    const ended = a.endedAtMs;
    // tick thêm sau khi đã kết thúc không đổi gì
    a = engineReducer(a, { type: "TICK", nowMs: a.deadlineMs! + 10_000 });
    expect(a.endedAtMs).toBe(ended);
  });

  it("không nhận SUBMIT sau khi đã finished", () => {
    let a = startRound();
    a = engineReducer(a, { type: "FINISH", nowMs: T0 + 1000 });
    a = engineReducer(a, {
      type: "SUBMIT_ANSWER",
      questionId: "q1",
      answer: { kind: "choice", optionId: "o1" },
      question: q("q1", "o1"),
    });
    expect(totalScore(a)).toBe(0);
  });

  it("remainingSeconds dùng deadline tuyệt đối, không âm", () => {
    const a = startRound();
    expect(remainingSeconds(a, T0 + 1_800_000 + 5000)).toBe(0);
    expect(remainingSeconds(a, T0 + 60_000)).toBe(1740);
  });

  describe("ngưỡng pass 140/150/200", () => {
    function scored(n: number): Attempt {
      let a = startRound();
      for (const id of ids.slice(0, n)) {
        a = engineReducer(a, {
          type: "SUBMIT_ANSWER",
          questionId: id,
          answer: { kind: "choice", optionId: "o1" },
          question: q(id, "o1"),
        });
      }
      return engineReducer(a, { type: "FINISH", nowMs: T0 + 1000 });
    }

    it("140 điểm: chưa pass", () => {
      expect(totalScore(scored(14))).toBe(140);
      expect(isPass(scored(14))).toBe(false);
    });

    it("150 điểm: pass", () => {
      expect(totalScore(scored(15))).toBe(150);
      expect(isPass(scored(15))).toBe(true);
    });

    it("200 điểm: pass", () => {
      expect(totalScore(scored(20))).toBe(200);
      expect(isPass(scored(20))).toBe(true);
    });

    it("luyện nhanh không pass kể cả điểm cao", () => {
      let a = createAttempt({
        id: "qk",
        mode: "quick",
        questionIds: ["q1", "q2", "q3", "q4", "q5"],
        nowMs: T0,
      });
      for (const id of ["q1", "q2", "q3", "q4", "q5"]) {
        a = engineReducer(a, {
          type: "SUBMIT_ANSWER",
          questionId: id,
          answer: { kind: "choice", optionId: "o1" },
          question: q(id, "o1"),
        });
      }
      expect(isPass(a)).toBe(false);
    });
  });
});
