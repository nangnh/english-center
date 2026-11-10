import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  generateAudio,
  type AudioManifest,
  type FsLike,
  type GenerateOptions,
} from "../../scripts/audio/generate-audio";
import type { TtsClient } from "../../scripts/audio/edge-tts-client";
import {
  extractPronounceableTexts,
} from "../../scripts/audio/extract";
import { ENCOURAGEMENTS } from "../../src/lib/encouragements";
import { normalizeText } from "../../src/lib/audio-key";
import type { Question, Topic, Difficulty } from "../../src/types";

// ---------------------------------------------------------------------------
// Test doubles: an in-memory FsLike fake + an always-succeeding fake TtsClient.
// These let us exercise the real generateAudio planning/dedup/manifest logic
// with no network and no real disk I/O.
// ---------------------------------------------------------------------------

const OUT_DIR = "/public/audio";
const MANIFEST_PATH = "/public/audio/manifest.json";
const QUESTIONS_PATH = "/src/data/questions.json";

/**
 * In-memory filesystem fake. Binary files live in `files` (path -> Buffer),
 * text files (questions.json, manifest.json) live in `texts` (path -> string).
 */
function createFakeFs(questionsJson: string): FsLike & {
  files: Map<string, Buffer>;
  texts: Map<string, string>;
} {
  const files = new Map<string, Buffer>();
  const texts = new Map<string, string>();
  texts.set(QUESTIONS_PATH, questionsJson);

  function basename(p: string): string {
    const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
    return idx >= 0 ? p.slice(idx + 1) : p;
  }

  return {
    files,
    texts,
    async readTextFile(path: string): Promise<string> {
      const t = texts.get(path);
      if (t === undefined) throw new Error(`ENOENT: ${path}`);
      return t;
    },
    async readManifest(manifestPath: string): Promise<AudioManifest | null> {
      const raw = texts.get(manifestPath);
      if (raw === undefined) return null;
      try {
        const parsed = JSON.parse(raw) as AudioManifest;
        return {
          version: parsed.version ?? 1,
          byText: parsed.byText ?? {},
          byHash: parsed.byHash ?? {},
        };
      } catch {
        return null;
      }
    },
    async listMp3Files(outDir: string): Promise<string[]> {
      const prefix = outDir.endsWith("/") ? outDir : outDir + "/";
      const names: string[] = [];
      for (const path of files.keys()) {
        if (path.startsWith(prefix) && path.toLowerCase().endsWith(".mp3")) {
          names.push(basename(path));
        }
      }
      return names;
    },
    async existsFile(path: string): Promise<boolean> {
      return files.has(path);
    },
    async writeFile(path: string, data: Buffer): Promise<void> {
      files.set(path, data);
    },
    async writeTextFile(path: string, data: string): Promise<void> {
      texts.set(path, data);
    },
    async deleteFile(path: string): Promise<void> {
      files.delete(path);
    },
  };
}

/**
 * Fake TtsClient that always succeeds and returns a non-empty Buffer derived
 * from the text. Deterministic and network-free.
 */
const fakeTts: TtsClient = {
  async synthesize(text: string): Promise<Buffer> {
    return Buffer.from("fake-mp3:" + text);
  },
};

function baseOptions(): GenerateOptions {
  return {
    voice: "en-US-AriaNeural",
    ratePercent: 85,
    questionsPath: QUESTIONS_PATH,
    outDir: OUT_DIR,
    manifestPath: MANIFEST_PATH,
  };
}

/** Read the manifest the generator just wrote via the fake fs. */
function readWrittenManifest(fs: {
  texts: Map<string, string>;
}): AudioManifest {
  const raw = fs.texts.get(MANIFEST_PATH);
  if (raw === undefined) throw new Error("manifest was not written");
  return JSON.parse(raw) as AudioManifest;
}

// ---------------------------------------------------------------------------
// fast-check arbitraries for Question[] (mirrors tests/unit/extract.test.ts).
// Only the kinds that produce extractable text matter; we keep English-ish
// ASCII for the extracted fields so they survive normalization.
// ---------------------------------------------------------------------------

// English-ish text with occasional surrounding/duplicate whitespace so that the
// normalization + dedup paths get real exercise (e.g. "cat" vs "  cat ").
const englishText = fc
  .stringOf(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      " ",
      " ",
      "'"
    ),
    { minLength: 1, maxLength: 16 }
  )
  // Ensure at least one letter so it never normalizes to an empty string.
  .map((s) => (/[a-zA-Z]/.test(s) ? s : `word ${s}`));

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

function baseArb() {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 8 }),
    topic,
    difficulty,
    promptVi: fc.constant("Hướng dẫn"),
    explanationVi: fc.constant("Giải thích"),
  });
}

const choiceOption = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  textEn: englishText,
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
    questionEn: "Câu lệnh",
    options,
    correctOptionId,
  }));

const matchingPair = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  leftEn: englishText,
  rightVi: fc.constant("nghĩa"),
});

const matchingArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), fc.array(matchingPair, { minLength: 1, maxLength: 3 }))
  .map(([base, pairs]) => ({
    ...base,
    kind: "matching" as const,
    pairs,
  }));

const listeningChoiceArb: fc.Arbitrary<Question> = fc
  .tuple(
    baseArb(),
    englishText,
    fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 6 }),
        textEn: fc.constant("lựa chọn"),
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
      promptVi: "Nghe và chọn",
      questionEn: "Câu lệnh",
    },
  }));

const spellFillArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), englishText)
  .map(([base, answerEn]) => ({
    ...base,
    kind: "spell-fill" as const,
    answerEn,
    blankIndexes: [0],
  }));

const unscrambleArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), englishText)
  .map(([base, answerEn]) => ({
    ...base,
    kind: "unscramble" as const,
    answerEn,
  }));

const questionArb: fc.Arbitrary<Question> = fc.oneof(
  choiceArb,
  matchingArb,
  listeningChoiceArb,
  spellFillArb,
  unscrambleArb
);

const datasetArb = fc.array(questionArb, { minLength: 0, maxLength: 10 });

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("generateAudio completeness & dedup (native-pronunciation)", () => {
  // Feature: native-pronunciation, Property 1: Manifest completeness — for any
  // valid Question_Dataset, every Pronounceable_Text whose normalized form is
  // non-empty resolves in manifest.byText to an existing /audio/<hash>.mp3 file.
  // Validates: Requirements 1.1, 2.1, 2.3, 7.1
  it("Property 1: every Pronounceable_Text is resolvable to an existing mp3", async () => {
    await fc.assert(
      fc.asyncProperty(datasetArb, async (questions) => {
        const fs = createFakeFs(JSON.stringify(questions));
        await generateAudio({
          ...baseOptions(),
          fs,
          ttsClient: fakeTts,
        });

        const manifest = readWrittenManifest(fs);

        for (const raw of extractPronounceableTexts(questions as Question[])) {
          const normalized = normalizeText(raw);
          if (normalized.length === 0) continue;

          // Key exists in byText.
          const path = manifest.byText[normalized];
          expect(path).toBeDefined();
          // Path is a same-origin static mp3 asset.
          expect(path).toMatch(/^\/audio\/.*\.mp3$/);
          // The referenced file actually exists in the (fake) filesystem.
          const diskPath = `${OUT_DIR}/${path.slice("/audio/".length)}`;
          expect(fs.files.has(diskPath)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: native-pronunciation, Property 3: Dedup by normalization — for any
  // two Pronounceable_Texts whose normalized form is equal, byText maps both to
  // the SAME path; and the number of distinct mp3 files equals the number of
  // distinct non-empty normalized texts (one file per unique normalized text).
  // Validates: Requirements 2.6, 7.1
  it("Property 3: normalized-equal texts share one file; one file per unique normalized text", async () => {
    await fc.assert(
      fc.asyncProperty(datasetArb, async (questions) => {
        const fs = createFakeFs(JSON.stringify(questions));
        await generateAudio({
          ...baseOptions(),
          fs,
          ttsClient: fakeTts,
        });

        const manifest = readWrittenManifest(fs);
        const rawTexts = extractPronounceableTexts(questions as Question[]);

        // (a) Any two raw texts that normalize equal map to the same path.
        for (const a of rawTexts) {
          for (const b of rawTexts) {
            const na = normalizeText(a);
            const nb = normalizeText(b);
            if (na.length === 0 || nb.length === 0) continue;
            if (na === nb) {
              expect(manifest.byText[na]).toBe(manifest.byText[nb]);
            }
          }
        }

        // (b) Dedup: one mp3 file per unique non-empty normalized text.
        const uniqueNormalized = new Set<string>();
        for (const raw of rawTexts) {
          const n = normalizeText(raw);
          if (n.length > 0) uniqueNormalized.add(n);
        }
        const distinctPaths = new Set(Object.values(manifest.byText));
        const mp3Files = await fs.listMp3Files(OUT_DIR);

        expect(distinctPaths.size).toBe(uniqueNormalized.size);
        expect(mp3Files.length).toBe(uniqueNormalized.size);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: native-pronunciation, Property 15: Manifest completeness for
  // encouragements — for any valid Question_Dataset, every ENCOURAGEMENTS entry
  // resolves (via its normalized form) to an existing mp3 in manifest.byText.
  // Validates: Requirements 8.2, 8.5
  it("Property 15: every ENCOURAGEMENTS message is resolvable to an existing mp3", async () => {
    await fc.assert(
      fc.asyncProperty(datasetArb, async (questions) => {
        const fs = createFakeFs(JSON.stringify(questions));
        await generateAudio({
          ...baseOptions(),
          fs,
          ttsClient: fakeTts,
        });

        const manifest = readWrittenManifest(fs);

        for (const enc of ENCOURAGEMENTS) {
          const normalized = normalizeText(enc);
          expect(normalized.length).toBeGreaterThan(0);

          const path = manifest.byText[normalized];
          expect(path).toBeDefined();
          expect(path).toMatch(/^\/audio\/.*\.mp3$/);

          const diskPath = `${OUT_DIR}/${path.slice("/audio/".length)}`;
          expect(fs.files.has(diskPath)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
