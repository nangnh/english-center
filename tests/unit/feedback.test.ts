import { describe, it, expect } from "vitest";
import { pickEncouragement } from "@/lib/sound";
import { autoSpeakText } from "@/lib/keyword";
import type {
  ChoiceQuestion,
  FillQuestion,
  ListeningChoiceQuestion,
  SpellFillQuestion,
  UnscrambleQuestion,
} from "@/types";

describe("lời động viên (R2)", () => {
  it("luôn trả về một câu không rỗng, không trách mắng", () => {
    for (let i = 0; i < 10; i += 1) {
      const msg = pickEncouragement(i);
      expect(msg.length).toBeGreaterThan(0);
      expect(msg.toLowerCase()).not.toMatch(/dốt|kém|ngu/);
    }
  });

  it("ổn định theo seed", () => {
    expect(pickEncouragement(3)).toBe(pickEncouragement(3));
  });
});

const choiceQ: ChoiceQuestion = {
  id: "c1",
  kind: "choice",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  questionEn: "Choose the word for con mèo.",
  options: [
    { id: "o1", textEn: "cat" },
    { id: "o2", textEn: "dog" },
  ],
  correctOptionId: "o1",
  explanationVi: "x",
};

const fillQ: FillQuestion = {
  id: "f1",
  kind: "fill",
  topic: "food",
  difficulty: 1,
  promptVi: "x",
  questionEn: "táo → ___",
  acceptedAnswers: ["apple"],
  explanationVi: "x",
};

const spellQ: SpellFillQuestion = {
  id: "s1",
  kind: "spell-fill",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  answerEn: "cat",
  blankIndexes: [1],
  explanationVi: "x",
};

const unscrambleQ: UnscrambleQuestion = {
  id: "u1",
  kind: "unscramble",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  answerEn: "dog",
  explanationVi: "x",
};

const listeningQ: ListeningChoiceQuestion = {
  id: "l1",
  kind: "listening-choice",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  speechTextEn: "cat",
  options: [{ id: "o1", textEn: "mèo" }],
  correctOptionId: "o1",
  readingFallback: { promptVi: "x", questionEn: "cat" },
  explanationVi: "x",
};

describe("tự phát từ khóa (R5): không lộ đáp án", () => {
  it("choice: phát câu hỏi tiếng Anh", () => {
    expect(autoSpeakText(choiceQ)).toBe("Choose the word for con mèo.");
  });

  it("listening: KHÔNG tự phát (null)", () => {
    expect(autoSpeakText(listeningQ)).toBeNull();
  });

  it("fill/spell-fill/unscramble: không tự phát để tránh lộ đáp án", () => {
    expect(autoSpeakText(fillQ)).toBeNull();
    expect(autoSpeakText(spellQ)).toBeNull();
    expect(autoSpeakText(unscrambleQ)).toBeNull();
  });
});
