// Sinh questions.json và rounds.json từ nội dung gốc.
// Chạy: npx tsx scripts/content/generate.ts (hoặc node sau khi biên dịch).
// Script bảo đảm: ≥160 câu, mỗi chủ đề ≥15, mỗi dạng ≥15,
// 8 vòng ×20 câu, mỗi vòng đủ 5 dạng, độ khó tăng nhẹ.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type {
  Difficulty,
  Question,
  Round,
  Topic,
} from "../../src/types/index.js";
import { validateBank, bankCoverage } from "../../src/lib/validation.js";
import { WORDS, type WordItem } from "./source.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "..", "src", "data");

const TOPICS: Topic[] = [
  "animals",
  "food",
  "school-things",
  "colours",
  "family",
  "alphabet",
  "numbers",
];

const questions: Question[] = [];
let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

// Lấy các phần tử khác item để làm đáp án nhiễu.
function distractors(topic: Topic, exclude: string[], n: number): WordItem[] {
  const pool = WORDS[topic].filter((w) => !exclude.includes(w.en));
  return pool.slice(0, n);
}

function optionIds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `o${i + 1}`);
}

// --- choice: chọn từ tiếng Anh đúng cho nghĩa tiếng Việt ---
function makeChoice(topic: Topic, item: WordItem, diff: Difficulty): Question {
  const wrong = distractors(topic, [item.en], 3);
  const all = [item, ...wrong];
  const ids = optionIds(all.length);
  return {
    id: nextId("c"),
    kind: "choice",
    topic,
    difficulty: diff,
    promptVi: `Từ tiếng Anh nào có nghĩa là “${item.vi}”?`,
    questionEn: `Choose the word for "${item.vi}".`,
    options: all.map((w, i) => ({ id: ids[i], textEn: w.en })),
    correctOptionId: ids[0],
    explanationVi: `“${item.vi}” trong tiếng Anh là “${item.en}”.`,
  };
}

// --- picture-choice: chọn tranh đúng cho từ tiếng Anh ---
function makePicture(topic: Topic, item: WordItem, diff: Difficulty): Question {
  const wrong = distractors(topic, [item.en], 2).filter((w) => w.asset);
  const all = [item, ...wrong].filter((w) => w.asset);
  const ids = optionIds(all.length);
  return {
    id: nextId("p"),
    kind: "picture-choice",
    topic,
    difficulty: diff,
    promptVi: `Chọn tranh đúng với từ “${item.en}”.`,
    questionEn: `Which picture shows "${item.en}"?`,
    options: all.map((w, i) => ({
      id: ids[i],
      asset: w.asset as string,
      alt: w.alt as string,
    })),
    correctOptionId: ids[0],
    explanationVi: `“${item.en}” nghĩa là “${item.vi}”.`,
  };
}

// --- matching: nối 3 từ tiếng Anh với nghĩa tiếng Việt ---
function makeMatching(topic: Topic, items: WordItem[], diff: Difficulty): Question {
  const three = items.slice(0, 3);
  return {
    id: nextId("m"),
    kind: "matching",
    topic,
    difficulty: diff,
    promptVi: "Nối mỗi từ tiếng Anh với nghĩa tiếng Việt đúng.",
    pairs: three.map((w, i) => ({
      id: `pair${i + 1}`,
      leftEn: w.en,
      rightVi: w.vi,
    })),
    explanationVi: three
      .map((w) => `${w.en} = ${w.vi}`)
      .join("; ") + ".",
  };
}

// --- fill: điền từ tiếng Anh còn thiếu ---
function makeFill(topic: Topic, item: WordItem, diff: Difficulty): Question {
  return {
    id: nextId("f"),
    kind: "fill",
    topic,
    difficulty: diff,
    promptVi: `Điền từ tiếng Anh nghĩa là “${item.vi}”.`,
    questionEn: `${item.vi} → ___`,
    acceptedAnswers: [item.en],
    explanationVi: `Đáp án: “${item.en}” nghĩa là “${item.vi}”.`,
  };
}

// --- listening-choice: nghe từ và chọn nghĩa tiếng Việt ---
function makeListening(topic: Topic, item: WordItem, diff: Difficulty): Question {
  const wrong = distractors(topic, [item.en], 3);
  const all = [item, ...wrong];
  const ids = optionIds(all.length);
  return {
    id: nextId("l"),
    kind: "listening-choice",
    topic,
    difficulty: diff,
    promptVi: "Bấm Nghe rồi chọn nghĩa tiếng Việt đúng.",
    speechTextEn: item.en,
    options: all.map((w, i) => ({ id: ids[i], textEn: w.vi })),
    correctOptionId: ids[0],
    readingFallback: {
      promptVi: "Đọc từ tiếng Anh dưới đây rồi chọn nghĩa đúng (bài đọc thay thế).",
      questionEn: item.en,
    },
    explanationVi: `Từ “${item.en}” nghĩa là “${item.vi}”.`,
  };
}

// --- spell-fill: điền chữ cái còn thiếu ---
function makeSpellFill(topic: Topic, item: WordItem, diff: Difficulty): Question {
  const word = item.en;
  // Khuyết 1 chữ với từ ngắn, 2 chữ với từ dài hơn; không khuyết chữ đầu.
  const blanks: number[] = [];
  if (word.length <= 3) {
    blanks.push(1);
  } else {
    blanks.push(1, Math.min(word.length - 1, 3));
  }
  const uniqueBlanks = Array.from(new Set(blanks)).sort((a, b) => a - b);
  return {
    id: nextId("s"),
    kind: "spell-fill",
    topic,
    difficulty: diff,
    promptVi: `Điền chữ còn thiếu để hoàn thành từ nghĩa là “${item.vi}”.`,
    answerEn: word,
    blankIndexes: uniqueBlanks,
    explanationVi: `Từ đúng là “${word}” nghĩa là “${item.vi}”.`,
  };
}

// --- unscramble: sắp xếp chữ cái ---
function makeUnscramble(topic: Topic, item: WordItem, diff: Difficulty): Question {
  return {
    id: nextId("u"),
    kind: "unscramble",
    topic,
    difficulty: diff,
    promptVi: `Sắp xếp các chữ cái để tạo từ nghĩa là “${item.vi}”.`,
    answerEn: item.en,
    explanationVi: `Từ đúng là “${item.en}” nghĩa là “${item.vi}”.`,
  };
}

// Độ khó theo chỉ số trong danh sách của chủ đề.
function diffFor(index: number): Difficulty {
  if (index < 2) return 1;
  if (index < 4) return 2;
  return 3;
}

// Chỉ dùng cho dạng chữ cái: từ có ≥2 chữ cái chữ thường (bỏ chữ đơn alphabet).
function isSpellable(item: WordItem): boolean {
  return /^[a-z]{2,}$/.test(item.en);
}

// Sinh đủ các dạng cho mỗi chủ đề.
for (const topic of TOPICS) {
  const items = WORDS[topic];
  const pictureItems = items.filter((w) => w.asset);

  // choice: mỗi từ 1 câu
  items.forEach((item, i) => questions.push(makeChoice(topic, item, diffFor(i))));

  // fill: mỗi từ 1 câu
  items.forEach((item, i) => questions.push(makeFill(topic, item, diffFor(i))));

  // listening: mỗi từ 1 câu
  items.forEach((item, i) =>
    questions.push(makeListening(topic, item, diffFor(i)))
  );

  // picture-choice: chỉ chủ đề có tranh, cần ≥2 tranh
  if (pictureItems.length >= 2) {
    pictureItems.forEach((item, i) =>
      questions.push(makePicture(topic, item, diffFor(i)))
    );
  }

  // matching: tạo nhiều câu nối (mỗi câu 3 cặp) bằng cách trượt cửa sổ
  for (let start = 0; start + 3 <= items.length; start += 1) {
    questions.push(makeMatching(topic, items.slice(start, start + 3), diffFor(start)));
  }

  // spell-fill + unscramble: chỉ với từ có ≥2 chữ cái (bỏ chữ đơn alphabet)
  const spellable = items.filter(isSpellable);
  spellable.forEach((item, i) =>
    questions.push(makeSpellFill(topic, item, diffFor(i)))
  );
  spellable.forEach((item, i) =>
    questions.push(makeUnscramble(topic, item, diffFor(i)))
  );
}

// ---- Lắp 8 vòng × 20 câu, mỗi vòng đủ 5 dạng, độ khó tăng nhẹ ----
const byKind: Record<string, Question[]> = {
  choice: [],
  "picture-choice": [],
  matching: [],
  fill: [],
  "listening-choice": [],
  "spell-fill": [],
  unscramble: [],
};
for (const q of questions) byKind[q.kind].push(q);
// Sắp theo độ khó để vòng sau khó hơn.
for (const k of Object.keys(byKind)) {
  byKind[k].sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
}

const rounds: Round[] = [];
// Mỗi vòng: 20 câu = 4 choice + 3 fill + 3 listening + 2 picture + 3 matching
// + 3 spell-fill + 2 unscramble, đủ cả 7 dạng.
const perRound: Array<[string, number]> = [
  ["choice", 4],
  ["fill", 3],
  ["listening-choice", 3],
  ["picture-choice", 2],
  ["matching", 3],
  ["spell-fill", 3],
  ["unscramble", 2],
];

// Cấp độ khó mục tiêu cho từng vòng để độ khó tăng dần.
const roundTargetDifficulty: Difficulty[] = [1, 1, 1, 2, 2, 2, 3, 3];

const consumed = new Set<string>();

// Lấy câu chưa dùng của một dạng, ưu tiên độ khó gần targetDiff nhất
// (và không thấp hơn khi còn lựa chọn), để vòng sau khó hơn vòng trước.
function pick(kind: string, targetDiff: Difficulty): Question | undefined {
  const pool = byKind[kind].filter((q) => !consumed.has(q.id));
  if (pool.length === 0) return undefined;
  pool.sort((a, b) => {
    const pa = a.difficulty >= targetDiff ? a.difficulty - targetDiff : 10 + (targetDiff - a.difficulty);
    const pb = b.difficulty >= targetDiff ? b.difficulty - targetDiff : 10 + (targetDiff - b.difficulty);
    return pa - pb || a.id.localeCompare(b.id);
  });
  return pool[0];
}

for (let r = 1; r <= 8; r += 1) {
  const targetDiff = roundTargetDifficulty[r - 1];
  const qids: string[] = [];
  for (const [kind, count] of perRound) {
    for (let i = 0; i < count; i += 1) {
      const q = pick(kind, targetDiff);
      if (!q) {
        throw new Error(
          `Vòng ${r}: không đủ câu dạng ${kind} (cần ${count}).`
        );
      }
      consumed.add(q.id);
      qids.push(q.id);
    }
  }
  rounds.push({
    id: `round-${r}`,
    titleVi: `Vòng ${r}`,
    questionIds: qids,
    stageSize: 5,
    durationSeconds: 1800,
    passScore: 150,
  });
}

// ---- Kiểm tra trước khi ghi ----
const coverage = bankCoverage(questions);
const result = validateBank(questions, rounds);

const problems: string[] = [...result.errors];
if (coverage.total < 160)
  problems.push(`Chưa đủ 160 câu (hiện ${coverage.total}).`);
for (const t of TOPICS) {
  if ((coverage.byTopic[t] ?? 0) < 15)
    problems.push(`Chủ đề ${t} < 15 câu (${coverage.byTopic[t] ?? 0}).`);
}
for (const k of Object.keys(byKind)) {
  if ((coverage.byKind[k] ?? 0) < 15)
    problems.push(`Dạng ${k} < 15 câu (${coverage.byKind[k] ?? 0}).`);
}

if (problems.length > 0) {
  console.error("SINH DỮ LIỆU THẤT BẠI:");
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "questions.json"),
  JSON.stringify(questions, null, 2) + "\n",
  "utf8"
);
writeFileSync(
  join(OUT_DIR, "rounds.json"),
  JSON.stringify(rounds, null, 2) + "\n",
  "utf8"
);

console.log("OK: đã sinh dữ liệu.");
console.log(`Tổng câu: ${coverage.total}`);
console.log("Theo chủ đề:", coverage.byTopic);
console.log("Theo dạng:", coverage.byKind);
console.log(`Số vòng: ${rounds.length}`);
