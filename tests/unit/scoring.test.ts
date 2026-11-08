import { describe, it, expect } from "vitest";
import { evaluate, normalizeFill } from "@/lib/scoring";
import type {
  ChoiceQuestion,
  FillQuestion,
  MatchingQuestion,
  PictureChoiceQuestion,
  ListeningChoiceQuestion,
} from "@/types";

const choiceQ: ChoiceQuestion = {
  id: "c1",
  kind: "choice",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  questionEn: "x",
  options: [
    { id: "o1", textEn: "cat" },
    { id: "o2", textEn: "dog" },
  ],
  correctOptionId: "o1",
  explanationVi: "x",
};

const pictureQ: PictureChoiceQuestion = {
  id: "p1",
  kind: "picture-choice",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  questionEn: "x",
  options: [
    { id: "o1", asset: "/a.svg", alt: "a" },
    { id: "o2", asset: "/b.svg", alt: "b" },
  ],
  correctOptionId: "o2",
  explanationVi: "x",
};

const fillQ: FillQuestion = {
  id: "f1",
  kind: "fill",
  topic: "food",
  difficulty: 1,
  promptVi: "x",
  questionEn: "x ___",
  acceptedAnswers: ["apple", "Apple"],
  explanationVi: "x",
};

const matchingQ: MatchingQuestion = {
  id: "m1",
  kind: "matching",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  pairs: [
    { id: "pair1", leftEn: "cat", rightVi: "mèo" },
    { id: "pair2", leftEn: "dog", rightVi: "chó" },
    { id: "pair3", leftEn: "fish", rightVi: "cá" },
  ],
  explanationVi: "x",
};

const listeningQ: ListeningChoiceQuestion = {
  id: "l1",
  kind: "listening-choice",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  speechTextEn: "cat",
  options: [
    { id: "o1", textEn: "mèo" },
    { id: "o2", textEn: "chó" },
  ],
  correctOptionId: "o1",
  readingFallback: { promptVi: "x", questionEn: "cat" },
  explanationVi: "x",
};

describe("chấm điểm 5 dạng (R3)", () => {
  it("choice: đúng được 10, sai được 0", () => {
    expect(evaluate(choiceQ, { kind: "choice", optionId: "o1" })).toEqual({
      correct: true,
      score: 10,
    });
    expect(evaluate(choiceQ, { kind: "choice", optionId: "o2" })).toEqual({
      correct: false,
      score: 0,
    });
  });

  it("picture-choice: chấm theo correctOptionId", () => {
    expect(
      evaluate(pictureQ, { kind: "picture-choice", optionId: "o2" }).correct
    ).toBe(true);
    expect(
      evaluate(pictureQ, { kind: "picture-choice", optionId: "o1" }).correct
    ).toBe(false);
  });

  it("listening-choice: chấm theo correctOptionId", () => {
    expect(
      evaluate(listeningQ, { kind: "listening-choice", optionId: "o1" }).correct
    ).toBe(true);
  });

  it("fill: trim + không phân biệt hoa thường", () => {
    expect(evaluate(fillQ, { kind: "fill", text: "  APPLE " }).correct).toBe(
      true
    );
    expect(evaluate(fillQ, { kind: "fill", text: "apple" }).correct).toBe(true);
  });

  it("fill: từ sai chính tả bị tính sai", () => {
    expect(evaluate(fillQ, { kind: "fill", text: "aple" }).correct).toBe(false);
    expect(evaluate(fillQ, { kind: "fill", text: "" }).correct).toBe(false);
  });

  it("matching: đúng chỉ khi đủ cả 3 cặp", () => {
    const allRight = {
      kind: "matching" as const,
      links: { pair1: "pair1", pair2: "pair2", pair3: "pair3" },
    };
    expect(evaluate(matchingQ, allRight).correct).toBe(true);
  });

  it("matching: sai một cặp là sai cả câu", () => {
    const oneWrong = {
      kind: "matching" as const,
      links: { pair1: "pair1", pair2: "pair3", pair3: "pair2" },
    };
    expect(evaluate(matchingQ, oneWrong).correct).toBe(false);
    expect(evaluate(matchingQ, oneWrong).score).toBe(0);
  });

  it("matching: thiếu cặp là sai", () => {
    const missing = {
      kind: "matching" as const,
      links: { pair1: "pair1", pair2: "pair2" },
    };
    expect(evaluate(matchingQ, missing).correct).toBe(false);
  });

  it("không trả lời (undefined) được 0", () => {
    expect(evaluate(choiceQ, undefined)).toEqual({ correct: false, score: 0 });
  });

  it("normalizeFill chỉ trim + lowercase", () => {
    expect(normalizeFill("  Hello ")).toBe("hello");
    expect(normalizeFill("A-B")).toBe("a-b"); // không strip dấu gạch
  });
});
