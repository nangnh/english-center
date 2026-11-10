import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  extractPronounceableTexts,
  extractQuestionTexts,
} from "../../scripts/audio/extract";
import { ENCOURAGEMENTS } from "../../src/lib/encouragements";
import { normalizeText } from "../../src/lib/audio-key";
import type { Question, Topic, Difficulty } from "../../src/types";

// Feature: native-pronunciation, Property 17: For any valid Question_Dataset,
// every Pronounceable_Text returned by extractPronounceableTexts (question texts
// plus ENCOURAGEMENTS) is non-empty after normalizeText and contains NO
// Vietnamese-specific diacritic characters (accented vowels à/á/ả/ã/ạ/â/ê/ô/ơ/ư
// families and đ/Đ), and is never pulled from Vietnamese-only fields
// (rightVi, Vietnamese-ized questionEn prompts). This guarantees the app never
// feeds Vietnamese text into the pronunciation path — i.e. no Vietnamese TTS.
// Validates: Requirements 8.1, 8.6

// Vietnamese-specific characters: accented vowel families + đ/Đ. Used both to
// (a) build the detection regex for the assertion and (b) poison the fields that
// MUST NOT be extracted, so a leak would be caught.
const VIETNAMESE_CHARS =
  "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ" +
  "ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ";

const VIETNAMESE_RE = new RegExp(`[${VIETNAMESE_CHARS}]`);

// English-ish strings: ASCII letters, spaces, and light punctuation. Constrained
// to the input space the extractor is supposed to return (English words/phrases).
// minLength 1 keeps them non-empty after normalization in the common case; we
// still assert non-emptiness after normalizeText below.
const englishText = fc
  .stringOf(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      " ",
      "'",
      "!",
      "?",
      "."
    ),
    { minLength: 1, maxLength: 20 }
  )
  // Ensure at least one letter so it never normalizes to an empty string.
  .map((s) => (/[a-zA-Z]/.test(s) ? s : `word ${s}`));

// Vietnamese-ish strings for the fields that MUST NOT be extracted. Always
// contains at least one Vietnamese diacritic so any accidental leak is detected.
const vietnameseText = fc
  .stringOf(fc.constantFrom(...VIETNAMESE_CHARS.split(""), " ", "a", "o"), {
    minLength: 0,
    maxLength: 12,
  })
  .map((s) => `Chọn đáp án đúng ${s}`);

const topic: fc.Arbitrary<Topic> = fc.constantFrom(
  "alphabet",
  "colors",
  "animals",
  "family",
  "school-things",
  "numbers",
  "food"
);

const difficulty: fc.Arbitrary<Difficulty> = fc.constantFrom(1, 2, 3);

// Common base fields. promptVi/explanationVi are Vietnamese-only and must never
// be extracted, so we poison them with diacritics.
function baseArb() {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 8 }),
    topic,
    difficulty,
    promptVi: vietnameseText,
    explanationVi: vietnameseText,
  });
}

const choiceOption = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  textEn: englishText, // EXTRACTED for `choice`
});

const choiceArb: fc.Arbitrary<Question> = fc
  .tuple(
    baseArb(),
    fc.array(choiceOption, { minLength: 1, maxLength: 4 }),
    fc.string({ minLength: 1, maxLength: 6 })
  )
  .map(([base, options, correctOptionId]) => ({
    ...base,
    kind: "choice" as const,
    questionEn: `Câu lệnh tiếng Việt-hóa đây — ${correctOptionId}`, // NOT extracted
    options,
    correctOptionId,
  }));

const pictureOption = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  asset: fc.constant("/illustrations/cat.svg"),
  alt: vietnameseText,
});

const pictureChoiceArb: fc.Arbitrary<Question> = fc
  .tuple(
    baseArb(),
    fc.array(pictureOption, { minLength: 1, maxLength: 4 }),
    fc.string({ minLength: 1, maxLength: 6 })
  )
  .map(([base, options, correctOptionId]) => ({
    ...base,
    kind: "picture-choice" as const,
    questionEn: "Câu lệnh tiếng Việt-hóa", // NOT extracted (picture-choice emits nothing)
    options,
    correctOptionId,
  }));

const matchingPair = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  leftEn: englishText, // EXTRACTED for `matching`
  rightVi: vietnameseText, // Vietnamese — must NOT be extracted
});

const matchingArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), fc.array(matchingPair, { minLength: 1, maxLength: 3 }))
  .map(([base, pairs]) => ({
    ...base,
    kind: "matching" as const,
    pairs,
  }));

const fillArb: fc.Arbitrary<Question> = fc
  .tuple(
    baseArb(),
    fc.array(fc.string({ minLength: 1, maxLength: 6 }), {
      minLength: 1,
      maxLength: 3,
    })
  )
  .map(([base, acceptedAnswers]) => ({
    ...base,
    kind: "fill" as const,
    questionEn: `Điền từ còn thiếu ___ (tiếng Việt-hóa)`, // NOT extracted
    acceptedAnswers,
  }));

const listeningChoiceArb: fc.Arbitrary<Question> = fc
  .tuple(
    baseArb(),
    englishText, // speechTextEn — EXTRACTED
    fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 6 }),
        textEn: vietnameseText, // options are Vietnamese — must NOT be extracted
      }),
      { minLength: 1, maxLength: 4 }
    ),
    fc.string({ minLength: 1, maxLength: 6 })
  )
  .map(([base, speechTextEn, options, correctOptionId]) => ({
    ...base,
    kind: "listening-choice" as const,
    speechTextEn,
    options,
    correctOptionId,
    readingFallback: {
      promptVi: "Nghe và chọn đáp án đúng",
      questionEn: "Câu lệnh tiếng Việt-hóa",
    },
  }));

const spellFillArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), englishText)
  .map(([base, answerEn]) => ({
    ...base,
    kind: "spell-fill" as const,
    answerEn, // EXTRACTED
    blankIndexes: [0],
  }));

const unscrambleArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), englishText)
  .map(([base, answerEn]) => ({
    ...base,
    kind: "unscramble" as const,
    answerEn, // EXTRACTED
  }));

const questionArb: fc.Arbitrary<Question> = fc.oneof(
  choiceArb,
  pictureChoiceArb,
  matchingArb,
  fillArb,
  listeningChoiceArb,
  spellFillArb,
  unscrambleArb
);

const datasetArb = fc.array(questionArb, { minLength: 0, maxLength: 12 });

describe("extract Pronounceable_Text (native-pronunciation, Property 17)", () => {
  it("every extracted text is non-empty after normalize and free of Vietnamese diacritics", () => {
    fc.assert(
      fc.property(datasetArb, (questions) => {
        const texts = extractPronounceableTexts(questions as Question[]);

        for (const text of texts) {
          const normalized = normalizeText(text);
          // Non-empty after normalization (R8.1 — a real English word/phrase).
          expect(normalized.length).toBeGreaterThan(0);
          // No Vietnamese-specific diacritic characters anywhere (R8.6).
          expect(VIETNAMESE_RE.test(text)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("ENCOURAGEMENTS are always appended and are English (no diacritics)", () => {
    fc.assert(
      fc.property(datasetArb, (questions) => {
        const texts = extractPronounceableTexts(questions as Question[]);
        // All encouragements present and Vietnamese-free.
        for (const enc of ENCOURAGEMENTS) {
          expect(texts).toContain(enc);
          expect(VIETNAMESE_RE.test(enc)).toBe(false);
          expect(normalizeText(enc).length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("question-only extraction never leaks Vietnamese-only fields", () => {
    fc.assert(
      fc.property(datasetArb, (questions) => {
        const texts = extractQuestionTexts(questions as Question[]);
        for (const text of texts) {
          expect(VIETNAMESE_RE.test(text)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});
