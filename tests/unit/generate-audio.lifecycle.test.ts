import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  generateAudio,
  type AudioManifest,
  type FsLike,
  type GenerateOptions,
} from "../../scripts/audio/generate-audio";
import type { TtsClient, SynthesizeOptions } from "../../scripts/audio/edge-tts-client";
import { extractPronounceableTexts } from "../../scripts/audio/extract";
import { normalizeText, hashText } from "../../src/lib/audio-key";
import type { Question, Topic, Difficulty } from "../../src/types";

// =============================================================================
// Test doubles — a SAME-style in-memory FsLike fake and a configurable fake
// TtsClient (duplicated locally so this file does not depend on task 4.4).
// =============================================================================

const QUESTIONS_PATH = "/virtual/questions.json";
const OUT_DIR = "/virtual/audio";
const MANIFEST_PATH = "/virtual/audio/manifest.json";

const BASE_OPTS: Omit<GenerateOptions, never> = {
  voice: "en-US-AriaNeural",
  ratePercent: 85,
  questionsPath: QUESTIONS_PATH,
  outDir: OUT_DIR,
  manifestPath: MANIFEST_PATH,
};

/**
 * In-memory filesystem fake implementing FsLike. Holds the questions.json text,
 * a map of .mp3 file path -> bytes, and the manifest.json text. Mirrors how the
 * real node fs is used by generateAudio: existsFile / listMp3Files / writeFile /
 * deleteFile for .mp3 and readManifest / writeTextFile for the manifest.
 */
class MemFs implements FsLike {
  private questionsJson: string;
  // path -> bytes
  files = new Map<string, Buffer>();
  private manifestJson: string | null = null;

  constructor(questions: Question[]) {
    this.questionsJson = JSON.stringify(questions);
  }

  setQuestions(questions: Question[]): void {
    this.questionsJson = JSON.stringify(questions);
  }

  /** Seed a raw .mp3 file (e.g. an orphan) directly into the fake fs. */
  seedMp3(fileName: string, bytes: Buffer): void {
    this.files.set(join(OUT_DIR, fileName), bytes);
  }

  mp3Names(): string[] {
    const prefix = OUT_DIR + "/";
    return [...this.files.keys()]
      .filter((p) => p.startsWith(prefix) && p.toLowerCase().endsWith(".mp3"))
      .map((p) => p.slice(prefix.length));
  }

  async readTextFile(path: string): Promise<string> {
    if (path === QUESTIONS_PATH) return this.questionsJson;
    throw new Error(`MemFs: unexpected readTextFile ${path}`);
  }

  async readManifest(manifestPath: string): Promise<AudioManifest | null> {
    if (manifestPath !== MANIFEST_PATH || this.manifestJson === null) return null;
    try {
      const parsed = JSON.parse(this.manifestJson) as AudioManifest;
      return {
        version: parsed.version ?? 1,
        byText: parsed.byText ?? {},
        byHash: parsed.byHash ?? {},
      };
    } catch {
      return null;
    }
  }

  async listMp3Files(outDir: string): Promise<string[]> {
    const prefix = outDir + "/";
    return [...this.files.keys()]
      .filter((p) => p.startsWith(prefix) && p.toLowerCase().endsWith(".mp3"))
      .map((p) => p.slice(prefix.length));
  }

  async existsFile(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async writeFile(path: string, data: Buffer): Promise<void> {
    this.files.set(path, Buffer.from(data));
  }

  async writeTextFile(path: string, data: string): Promise<void> {
    if (path === MANIFEST_PATH) {
      this.manifestJson = data;
      return;
    }
    throw new Error(`MemFs: unexpected writeTextFile ${path}`);
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }
}

/** Minimal path join mirroring node's posix join for the virtual paths used here. */
function join(...parts: string[]): string {
  return parts
    .map((p, i) => (i === 0 ? p.replace(/\/+$/, "") : p.replace(/^\/+|\/+$/g, "")))
    .filter((p) => p.length > 0)
    .join("/");
}

/**
 * Configurable fake TtsClient. Returns a deterministic non-empty Buffer by
 * default, but THROWS for any normalized text in `poison` (to simulate TTS
 * failure). Tracks every synthesize call via `calls` (the normalized texts) so
 * tests can assert reuse (zero calls) vs regeneration.
 */
class FakeTts implements TtsClient {
  calls: string[] = [];
  constructor(private poison: Set<string> = new Set()) {}

  setPoison(poison: Set<string>): void {
    this.poison = poison;
  }

  reset(): void {
    this.calls = [];
  }

  async synthesize(text: string, _opts: SynthesizeOptions): Promise<Buffer> {
    this.calls.push(text);
    if (this.poison.has(text)) {
      throw new Error(`FakeTts: poisoned text "${text}"`);
    }
    // Deterministic non-empty bytes derived from the text.
    return Buffer.from(`mp3:${text}`, "utf8");
  }
}

// =============================================================================
// Concise Question arbitrary (as in tests/unit/extract.test.ts), restricted to
// the English-bearing fields the generator keys off. English-ish text keeps the
// input space sane and non-empty after normalization.
// =============================================================================

const englishText = fc
  .stringOf(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split(""), " "),
    { minLength: 1, maxLength: 10 }
  )
  .map((s) => (/[a-z]/.test(s) ? s : `word ${s}`));

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
    id: fc.string({ minLength: 1, maxLength: 6 }),
    topic,
    difficulty,
    promptVi: fc.constant("Chọn đáp án đúng"),
    explanationVi: fc.constant("Giải thích"),
  });
}

const choiceArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), fc.array(englishText, { minLength: 1, maxLength: 3 }))
  .map(([base, words]) => ({
    ...base,
    kind: "choice" as const,
    questionEn: "Câu lệnh tiếng Việt-hóa",
    options: words.map((textEn, i) => ({ id: `o${i}`, textEn })),
    correctOptionId: "o0",
  }));

const matchingArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), fc.array(englishText, { minLength: 1, maxLength: 3 }))
  .map(([base, lefts]) => ({
    ...base,
    kind: "matching" as const,
    pairs: lefts.map((leftEn, i) => ({ id: `p${i}`, leftEn, rightVi: "mèo" })),
  }));

const listeningChoiceArb: fc.Arbitrary<Question> = fc
  .tuple(baseArb(), englishText)
  .map(([base, speechTextEn]) => ({
    ...base,
    kind: "listening-choice" as const,
    speechTextEn,
    options: [{ id: "o0", textEn: "mèo" }],
    correctOptionId: "o0",
    readingFallback: { promptVi: "Nghe", questionEn: "Câu lệnh" },
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

const datasetArb = fc.array(questionArb, { minLength: 0, maxLength: 8 });

/** Distinct non-empty normalized texts for a dataset (= unique Pronounceable_Text). */
function distinctNormalized(questions: Question[]): Set<string> {
  const set = new Set<string>();
  for (const raw of extractPronounceableTexts(questions)) {
    const n = normalizeText(raw);
    if (n.length > 0) set.add(n);
  }
  return set;
}

/** Hex-hash string arbitrary that is NOT one of the dataset's current hashes. */
const randomHex = fc.hexaString({ minLength: 16, maxLength: 16 });

// =============================================================================
// Property 4: file count == number of unique texts (orphan removal)
// =============================================================================

describe("generate-audio lifecycle (native-pronunciation, Property 4)", () => {
  // Feature: native-pronunciation, Property 4: For any initial set of .mp3 files
  // in public/audio and any Question_Dataset, after the generator runs the number
  // of remaining .mp3 files equals exactly the number of distinct normalized
  // Pronounceable_Text of the current dataset (no orphans left, no duplicates).
  // Validates: Requirements 7.4, 2.1
  it("file count equals unique normalized text count and seeded orphans are removed", async () => {
    await fc.assert(
      fc.asyncProperty(
        datasetArb,
        fc.array(randomHex, { minLength: 0, maxLength: 6 }),
        async (questions, orphanHexes) => {
          const fs = new MemFs(questions);
          const unique = distinctNormalized(questions);
          const currentHashes = new Set([...unique].map((t) => hashText(t)));

          // Seed arbitrary extra <randomhex>.mp3 files that are NOT in the
          // dataset (orphans). Skip any that collide with a current hash.
          const seededOrphans = new Set<string>();
          for (const hex of orphanHexes) {
            if (currentHashes.has(hex)) continue;
            fs.seedMp3(`${hex}.mp3`, Buffer.from("orphan"));
            seededOrphans.add(hex);
          }

          const tts = new FakeTts();
          const report = await generateAudio({ ...BASE_OPTS, ttsClient: tts, fs });

          const remaining = fs.mp3Names();
          // Exactly one file per unique normalized text.
          expect(remaining.length).toBe(unique.size);

          // Every remaining file's hash is in the current hash set (no orphans).
          for (const name of remaining) {
            const hash = name.replace(/\.mp3$/i, "");
            expect(currentHashes.has(hash)).toBe(true);
          }

          // removedOrphans includes every seeded extra.
          for (const hex of seededOrphans) {
            expect(report.removedOrphans).toContain(hex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 5: reuse iff hash matches (reuse + regenerate-on-change)
// =============================================================================

describe("generate-audio lifecycle (native-pronunciation, Property 5)", () => {
  // Feature: native-pronunciation, Property 5: For any Pronounceable_Text that
  // already has a file, the generator reuses the file (no TTS call) if and only
  // if hashText(normalizeText(text)) matches the hash stored in the manifest; if
  // the hash differs, the generator regenerates and overwrites the file.
  // Validates: Requirements 7.2, 7.3
  it("second run reuses all (zero synth); a mutated text is regenerated while others stay reused", async () => {
    await fc.assert(
      fc.asyncProperty(
        // At least one question so there is something to mutate.
        fc.array(questionArb, { minLength: 1, maxLength: 8 }),
        englishText,
        async (questions, mutation) => {
          const fs = new MemFs(questions);

          // --- Run 1: fresh. All synths succeed. ---
          const tts1 = new FakeTts();
          const report1 = await generateAudio({ ...BASE_OPTS, ttsClient: tts1, fs });
          const unique1 = distinctNormalized(questions);
          // Fresh run creates one file per unique text, none reused.
          expect(report1.created.length).toBe(unique1.size);
          expect(report1.reused.length).toBe(0);
          expect(tts1.calls.length).toBe(unique1.size);

          // --- Run 2: same dataset, manifest + files persisted. ---
          const tts2 = new FakeTts();
          const report2 = await generateAudio({ ...BASE_OPTS, ttsClient: tts2, fs });
          // Zero synth calls; every current hash is reused.
          expect(tts2.calls.length).toBe(0);
          expect(report2.reused.length).toBe(unique1.size);
          expect(report2.created.length).toBe(0);
          expect(report2.regenerated.length).toBe(0);

          // --- Run 3: mutate one text so its normalized hash changes. ---
          // Change the first question's English field; derive the new text and
          // confirm it is genuinely new (different normalized value).
          const q0 = questions[0];
          const mutated = questions.map((q) => ({ ...q }));
          const changedText = `${mutation} xyzmut`;
          const m0 = mutated[0] as Question;
          let changedNormalized: string | null = null;
          switch (m0.kind) {
            case "choice":
              (m0 as typeof q0 & { options: { id: string; textEn: string }[] }).options = [
                { id: "o0", textEn: changedText },
              ];
              (m0 as { correctOptionId: string }).correctOptionId = "o0";
              changedNormalized = normalizeText(changedText);
              break;
            case "matching":
              (m0 as { pairs: { id: string; leftEn: string; rightVi: string }[] }).pairs = [
                { id: "p0", leftEn: changedText, rightVi: "mèo" },
              ];
              changedNormalized = normalizeText(changedText);
              break;
            case "listening-choice":
              (m0 as { speechTextEn: string }).speechTextEn = changedText;
              changedNormalized = normalizeText(changedText);
              break;
            case "spell-fill":
            case "unscramble":
              (m0 as { answerEn: string }).answerEn = changedText;
              changedNormalized = normalizeText(changedText);
              break;
            default:
              break;
          }

          const uniqueAfter = distinctNormalized(mutated as Question[]);
          // Only proceed with the assertion if the mutation produced a text that
          // is actually new (not already present from another question/encourage).
          const newHash = changedNormalized ? hashText(changedNormalized) : null;
          const wasPresentBefore =
            changedNormalized !== null && unique1.has(changedNormalized);

          fs.setQuestions(mutated as Question[]);
          const tts3 = new FakeTts();
          const report3 = await generateAudio({ ...BASE_OPTS, ttsClient: tts3, fs });

          if (newHash !== null && !wasPresentBefore) {
            // The changed text's hash must be synthesized (created or regenerated).
            const synthesizedHashes = new Set(
              tts3.calls.map((t) => hashText(normalizeText(t)))
            );
            expect(synthesizedHashes.has(newHash)).toBe(true);

            // Unchanged texts that still exist are reused (not re-synthesized).
            // Any text present in BOTH run-1 unique set and the after set, other
            // than the changed one, must not be synthesized in run 3.
            const stillPresentUnchanged = [...uniqueAfter].filter(
              (t) => unique1.has(t) && t !== changedNormalized
            );
            const synthesizedTexts = new Set(
              tts3.calls.map((t) => normalizeText(t))
            );
            for (const t of stillPresentUnchanged) {
              expect(synthesizedTexts.has(t)).toBe(false);
              expect(report3.reused).toContain(hashText(t));
            }
          }

          // Final file count always matches unique texts of the mutated dataset.
          expect(fs.mp3Names().length).toBe(uniqueAfter.size);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 6: keep valid files when one entry fails
// =============================================================================

describe("generate-audio lifecycle (native-pronunciation, Property 6)", () => {
  // Feature: native-pronunciation, Property 6: For any set of valid
  // Pregenerated_Audio present beforehand and any entry that fails to generate
  // (TTS error / quota), the generator keeps every valid existing file unchanged
  // (not deleted, not overwritten) and collects the failing entry in the report.
  // Validates: Requirements 1.7, 4.5
  it("an existing text that fails keeps its prior bytes; a brand-new failing text writes no file and is missing", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(questionArb, { minLength: 1, maxLength: 8 }),
        async (questions) => {
          const fs = new MemFs(questions);

          // --- Successful first run so valid files + manifest exist. ---
          const tts1 = new FakeTts();
          await generateAudio({ ...BASE_OPTS, ttsClient: tts1, fs });

          const unique = [...distinctNormalized(questions)];
          // Pick one existing text to poison on the next run.
          const chosen = unique[0];
          const chosenHash = hashText(chosen);
          const chosenPath = join(OUT_DIR, `${chosenHash}.mp3`);
          const bytesBefore = fs.files.get(chosenPath);
          expect(bytesBefore).toBeDefined();

          // Re-run with a client that throws for the chosen existing text.
          // Note: reuse path short-circuits before TTS for texts with files +
          // manifest entries, so the file stays intact regardless; we still
          // assert bytes are unchanged and no empty file was written.
          const tts2 = new FakeTts(new Set([chosen]));
          await generateAudio({ ...BASE_OPTS, ttsClient: tts2, fs });

          // Previously-existing file is still present and byte-identical.
          const bytesAfter = fs.files.get(chosenPath);
          expect(bytesAfter).toBeDefined();
          expect(bytesAfter!.equals(bytesBefore!)).toBe(true);
          // No empty file was written for it.
          expect(bytesAfter!.length).toBeGreaterThan(0);

          // --- Brand-new text that fails with no prior file. ---
          // Add a new question whose English text is unique and poison it.
          const newText = "brandnewfailtext";
          const newNormalized = normalizeText(newText);
          const newHash = hashText(newNormalized);
          const withNew: Question[] = [
            ...questions,
            {
              id: "new-fail",
              topic: "animals",
              difficulty: 1,
              promptVi: "Chọn",
              explanationVi: "Giải thích",
              kind: "unscramble",
              answerEn: newText,
            } as Question,
          ];
          fs.setQuestions(withNew);
          const tts3 = new FakeTts(new Set([newNormalized]));
          const report3 = await generateAudio({ ...BASE_OPTS, ttsClient: tts3, fs });

          // No file written for the brand-new failing text.
          expect(fs.files.has(join(OUT_DIR, `${newHash}.mp3`))).toBe(false);
          // It appears in missing and failed.
          expect(report3.missing).toContain(newNormalized);
          expect(report3.failed.some((f) => f.text === newNormalized)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 7: build gate lists every missing text (full list)
// =============================================================================

describe("generate-audio lifecycle (native-pronunciation, Property 7)", () => {
  // Feature: native-pronunciation, Property 7: For any Question_Dataset and any
  // set of files, if at least one Pronounceable_Text lacks a valid file then
  // report.missing equals EXACTLY the set of normalized texts without a valid
  // file (the full list) and is non-empty — the data the CLI build gate uses to
  // fail with a complete missing list (no partial build result).
  // Validates: Requirements 2.8, 7.5
  it("report.missing equals exactly the set of normalized texts with no valid file", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Need >=1 question; we poison a random subset of NEW texts (no prior files).
        fc.array(questionArb, { minLength: 1, maxLength: 8 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        async (questions, poisonFraction) => {
          const fs = new MemFs(questions);
          const unique = [...distinctNormalized(questions)];

          // Fresh run (no prior files), poison a subset of the unique texts.
          // Deterministically pick a subset by index using poisonFraction.
          const poison = new Set<string>();
          const cutoff = Math.floor(unique.length * poisonFraction);
          for (let i = 0; i < cutoff; i++) poison.add(unique[i]);

          const tts = new FakeTts(poison);
          const report = await generateAudio({ ...BASE_OPTS, ttsClient: tts, fs });

          // Expected missing = exactly the normalized texts whose hash has no
          // valid file. Since this is a fresh run with no prior files, that is
          // exactly the poisoned set (dedup by hash via normalized set).
          const expectedMissing = new Set(poison);
          const actualMissing = new Set(report.missing);

          expect(actualMissing).toEqual(expectedMissing);

          // When at least one text was poisoned, missing is non-empty (gate fails).
          if (poison.size > 0) {
            expect(report.missing.length).toBeGreaterThan(0);
          } else {
            expect(report.missing.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
