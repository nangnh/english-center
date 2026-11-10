// TTS_Generator (build-time): tạo sẵn tệp .mp3 cho mọi Pronounceable_Text của
// bộ dữ liệu + câu động viên, sinh Audio_Manifest, tái dùng theo hash, dọn mồ côi.
// Chạy dưới tsx (cùng phong cách scripts/content/generate.ts) nên import dùng ".js".
//
// Lõi `generateAudio` được thiết kế để TEST ĐƯỢC mà không cần mạng hay tệp thật:
//   - `ttsClient` (TtsClient) được inject — test dùng client giả.
//   - lớp filesystem `FsLike` được inject — test dùng fake trong bộ nhớ / thư mục tạm.
// Mặc định dùng EdgeTtsClient (msedge-tts) và node:fs/promises.
//
// Lưu ý phạm vi task 4.2: hàm này KHÔNG gọi process.exit. Cổng fail-on-missing và
// điểm vào CLI thuộc task 4.3. `generateAudio` chỉ trả về GenerateReport (gồm
// `missing`) để task 4.3 quyết định dừng build.
//
// _Requirements: 2.1, 2.2, 2.3, 2.6, 7.1, 7.2, 7.3, 7.4, 1.6, 1.7, 4.5_

import { readFile, writeFile, unlink, readdir, mkdir } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types/index.js";
import {
  normalizeText,
  hashText,
  audioPathForHash,
} from "../../src/lib/audio-key.js";
import { extractPronounceableTexts } from "./extract.js";
import { EdgeTtsClient, type TtsClient } from "./edge-tts-client.js";
import { loadTtsConfig } from "./config.js";

/** Siêu dữ liệu mỗi tệp audio lưu trong manifest để so khớp tái dùng (R7.2). */
export interface ManifestEntry {
  /** Văn bản ĐÃ chuẩn hóa đã tạo ra tệp này (đại diện; nhiều khóa byText có thể trùng hash). */
  text: string;
  /** Tên giọng đã dùng, ví dụ "en-US-AriaNeural". */
  voice: string;
  /** Tốc độ đọc theo phần trăm tốc độ gốc đã dùng (R1.5). */
  rate: number;
}

/**
 * Audio_Manifest (public/audio/manifest.json).
 *  - `byText`: khóa = văn bản ĐÃ chuẩn hóa → đường dẫn tĩnh "/audio/<hash>.mp3".
 *              Runtime chỉ dùng phần này.
 *  - `byHash`: hash → siêu dữ liệu, dùng ở build-time để so khớp tái dùng (R7.2).
 */
export interface AudioManifest {
  version: number;
  byText: Record<string, string>;
  byHash: Record<string, ManifestEntry>;
}

/** Tùy chọn cho generator (theo design.md). */
export interface GenerateOptions {
  /** Tên giọng (mặc định đọc từ env/cấu hình ở lớp gọi; vd "en-US-AriaNeural"). */
  voice: string;
  /** Tốc độ đọc theo phần trăm tốc độ gốc, trong [80, 90] (R1.5). */
  ratePercent: number;
  /** Đường dẫn questions.json. */
  questionsPath: string;
  /** Thư mục xuất tệp .mp3 (vd public/audio). */
  outDir: string;
  /** Đường dẫn manifest.json (vd public/audio/manifest.json). */
  manifestPath: string;
}

/** Báo cáo kết quả một lần chạy generator. */
export interface GenerateReport {
  /** Hash đã tạo mới (chưa từng có tệp). */
  created: string[];
  /** Hash tái dùng (tệp có + hash khớp manifest cũ). */
  reused: string[];
  /** Hash tạo lại & ghi đè (tệp có nhưng hash manifest cũ khác). */
  regenerated: string[];
  /** Hash tệp mồ côi đã xóa (không thuộc dataset hiện tại). */
  removedOrphans: string[];
  /**
   * Văn bản ĐÃ chuẩn hóa còn thiếu tệp hợp lệ sau khi chạy (gây exit(1) ở task 4.3).
   * Mảng rỗng nghĩa là mọi Pronounceable_Text đều resolvable.
   */
  missing: string[];
  /** Các mục tạo thất bại, kèm lý do; KHÔNG ghi đè tệp cũ hợp lệ (R1.7, R4.5). */
  failed: { text: string; reason: string }[];
}

/**
 * Lớp trừu tượng filesystem mà generator phụ thuộc vào. Mặc định dùng node:fs,
 * nhưng test có thể inject fake trong bộ nhớ hoặc dùng thư mục tạm.
 */
export interface FsLike {
  /** Đọc nội dung text một tệp (vd questions.json). Ném nếu không đọc được. */
  readTextFile(path: string): Promise<string>;
  /** Đọc manifest cũ nếu có; trả `null` khi chưa tồn tại / không đọc được. */
  readManifest(manifestPath: string): Promise<AudioManifest | null>;
  /** Liệt kê tên tệp `.mp3` (không kèm đường dẫn) trong `outDir`. */
  listMp3Files(outDir: string): Promise<string[]>;
  /** Kiểm tra một tệp có tồn tại không. */
  existsFile(path: string): Promise<boolean>;
  /** Ghi dữ liệu nhị phân ra tệp (tạo thư mục cha nếu cần). */
  writeFile(path: string, data: Buffer): Promise<void>;
  /** Ghi văn bản ra tệp (dùng cho manifest.json; tạo thư mục cha nếu cần). */
  writeTextFile(path: string, data: string): Promise<void>;
  /** Xóa một tệp; bỏ qua nếu không tồn tại. */
  deleteFile(path: string): Promise<void>;
}

/** FsLike thật dựa trên node:fs/promises (mặc định khi chạy build). */
export function createNodeFs(): FsLike {
  return {
    async readTextFile(path: string): Promise<string> {
      return readFile(path, "utf8");
    },
    async readManifest(manifestPath: string): Promise<AudioManifest | null> {
      try {
        const raw = await readFile(manifestPath, "utf8");
        const parsed = JSON.parse(raw) as AudioManifest;
        // Chuẩn hóa phòng khi manifest cũ thiếu trường.
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
      try {
        const names = await readdir(outDir);
        return names.filter((n) => n.toLowerCase().endsWith(".mp3"));
      } catch {
        return [];
      }
    },
    async existsFile(path: string): Promise<boolean> {
      try {
        await readFile(path);
        return true;
      } catch {
        return false;
      }
    },
    async writeFile(path: string, data: Buffer): Promise<void> {
      await ensureParentDir(path);
      await writeFile(path, data);
    },
    async writeTextFile(path: string, data: string): Promise<void> {
      await ensureParentDir(path);
      await writeFile(path, data, "utf8");
    },
    async deleteFile(path: string): Promise<void> {
      try {
        await unlink(path);
      } catch {
        // Bỏ qua: tệp không tồn tại coi như đã xóa.
      }
    },
  };
}

/** Tạo thư mục cha của một đường dẫn tệp nếu chưa có. */
async function ensureParentDir(filePath: string): Promise<void> {
  const idx = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (idx <= 0) return;
  const dir = filePath.slice(0, idx);
  await mkdir(dir, { recursive: true });
}

/** Tên tệp .mp3 từ hash (không kèm thư mục): "<hash>.mp3". */
function mp3FileName(hash: string): string {
  return `${hash}.mp3`;
}

/** Hash suy ra từ tên tệp "<hash>.mp3" → "<hash>" (null nếu không hợp lệ). */
function hashFromMp3FileName(fileName: string): string | null {
  const m = /^([0-9a-f]+)\.mp3$/i.exec(fileName);
  return m ? m[1] : null;
}

/**
 * Lõi TTS_Generator. Thuần về mặt hiệu ứng ngoài: mọi I/O đi qua `fs` inject được,
 * mọi tổng hợp giọng đi qua `ttsClient` inject được. KHÔNG gọi process.exit.
 *
 * Luồng (theo design.md mục "scripts/audio/generate-audio.ts"):
 *  1. Nạp questions.json + ENCOURAGEMENTS → extractPronounceableTexts → normalize
 *     → bỏ trùng → Map `normalized -> hash` (R2.6 dedup theo chuẩn hóa).
 *  2. Nạp manifest cũ (biết hash nào đã có tệp + hash lưu).
 *  3. Lập kế hoạch mỗi normalized: tái dùng (tệp có & hash khớp — R7.2) /
 *     tạo lại & ghi đè (tệp có & hash khác — R7.3) / tạo mới (chưa có tệp — R2.1).
 *  4. Gọi TTS cho mục cần tạo; ghi .mp3. Một mục lỗi → gom `failed`, KHÔNG ghi đè
 *     tệp cũ hợp lệ, KHÔNG ghi tệp rỗng/hỏng (R1.7, R4.5).
 *  5. Dọn mồ côi: xóa *.mp3 không thuộc tập hash hiện tại (R7.4).
 *  6. Ghi manifest.json SAU CÙNG với byText + byHash (R2.3).
 *  7. Tính `missing` = normalized thiếu tệp hợp lệ sau khi chạy (cho cổng task 4.3).
 */
export async function generateAudio(
  opts: GenerateOptions & { ttsClient?: TtsClient; fs?: FsLike }
): Promise<GenerateReport> {
  const fs = opts.fs ?? createNodeFs();
  const ttsClient = opts.ttsClient ?? new EdgeTtsClient();

  const report: GenerateReport = {
    created: [],
    reused: [],
    regenerated: [],
    removedOrphans: [],
    missing: [],
    failed: [],
  };

  // --- 1. Nạp input + chuẩn hóa + bỏ trùng theo chuẩn hóa ---
  // extractPronounceableTexts đã gộp cả văn bản câu hỏi lẫn ENCOURAGEMENTS (R8.5),
  // nên mỗi câu động viên chắc chắn có mặt trong nguồn đầu vào duy nhất này.
  const questions = await loadQuestions(fs, opts.questionsPath);
  const rawTexts = extractPronounceableTexts(questions);

  // Map normalized -> hash. Hai văn bản chuẩn hóa trùng → cùng một hash → một tệp.
  const normalizedToHash = new Map<string, string>();
  for (const raw of rawTexts) {
    const normalized = normalizeText(raw);
    if (normalized.length === 0) continue; // bỏ chuỗi rỗng sau chuẩn hóa
    if (!normalizedToHash.has(normalized)) {
      normalizedToHash.set(normalized, hashText(normalized));
    }
  }

  // Tập hash duy nhất của dataset hiện tại.
  const currentHashes = new Set<string>(normalizedToHash.values());

  // --- 2. Nạp manifest cũ ---
  const oldManifest = await fs.readManifest(opts.manifestPath);
  const oldByHash = oldManifest?.byHash ?? {};

  // --- 3 + 4. Lập kế hoạch & thực thi cho từng hash duy nhất ---
  // Gom theo hash để mỗi tệp được xử lý đúng một lần (dù nhiều normalized trùng hash).
  const hashToText = new Map<string, string>();
  for (const [normalized, hash] of normalizedToHash) {
    if (!hashToText.has(hash)) hashToText.set(hash, normalized);
  }

  // Theo dõi hash có tệp hợp lệ sau khi chạy (để tính missing & viết byHash).
  const validHashes = new Set<string>();
  const entryByHash: Record<string, ManifestEntry> = {};

  for (const [hash, normalized] of hashToText) {
    const filePath = join(opts.outDir, mp3FileName(hash));
    const fileExists = await fs.existsFile(filePath);
    const oldEntry = oldByHash[hash];

    if (fileExists && oldEntry) {
      // Tệp có + hash khớp manifest cũ → TÁI DÙNG (R7.2), không gọi lại TTS.
      report.reused.push(hash);
      validHashes.add(hash);
      entryByHash[hash] = {
        text: normalized,
        voice: oldEntry.voice ?? opts.voice,
        rate: oldEntry.rate ?? opts.ratePercent,
      };
      continue;
    }

    // Cần tạo: hoặc chưa có tệp (tạo mới), hoặc có tệp nhưng không khớp hash
    // manifest cũ (văn bản đổi → tạo lại & ghi đè — R7.3).
    const isRegenerate = fileExists && !oldEntry;
    try {
      const buffer = await ttsClient.synthesize(normalized, {
        voice: opts.voice,
        ratePercent: opts.ratePercent,
      });
      if (!buffer || buffer.length === 0) {
        throw new Error("TTS trả về dữ liệu rỗng");
      }
      // Chỉ ghi khi có buffer hợp lệ → không bao giờ tạo tệp rỗng/hỏng (R4.5).
      await fs.writeFile(filePath, buffer);
      validHashes.add(hash);
      entryByHash[hash] = {
        text: normalized,
        voice: opts.voice,
        rate: opts.ratePercent,
      };
      if (isRegenerate) report.regenerated.push(hash);
      else report.created.push(hash);
    } catch (err) {
      // Mục lỗi: KHÔNG ghi đè tệp cũ, KHÔNG tạo tệp rỗng. Gom vào failed (R1.7, R4.5).
      report.failed.push({
        text: normalized,
        reason: err instanceof Error ? err.message : String(err),
      });
      // Nếu trước đó có tệp hợp lệ (trường hợp regenerate lỗi), giữ nguyên nó:
      // tệp vẫn tồn tại trên đĩa nên không thêm vào missing nếu còn dùng được.
      if (fileExists) {
        validHashes.add(hash);
        // Giữ metadata cũ nếu có để manifest phản ánh tệp còn trên đĩa.
        if (oldEntry) {
          entryByHash[hash] = {
            text: normalized,
            voice: oldEntry.voice ?? opts.voice,
            rate: oldEntry.rate ?? opts.ratePercent,
          };
        }
      }
    }
  }

  // --- 5. Dọn tệp mồ côi: xóa *.mp3 không thuộc tập hash hiện tại (R7.4) ---
  const existingFiles = await fs.listMp3Files(opts.outDir);
  for (const fileName of existingFiles) {
    const hash = hashFromMp3FileName(fileName);
    if (hash === null) continue; // bỏ qua tệp không đúng khuôn tên
    if (!currentHashes.has(hash)) {
      await fs.deleteFile(join(opts.outDir, fileName));
      report.removedOrphans.push(hash);
    }
  }

  // --- 6. Ghi manifest.json SAU CÙNG (R2.3) ---
  // byText: mọi normalized → đường dẫn tĩnh của hash tương ứng (nhiều khóa có thể
  // trỏ chung một tệp khi chuẩn hóa trùng — R2.6). Chỉ ghi khóa có tệp hợp lệ.
  const byText: Record<string, string> = {};
  for (const [normalized, hash] of normalizedToHash) {
    if (validHashes.has(hash)) {
      byText[normalized] = audioPathForHash(hash);
    }
  }
  const byHash: Record<string, ManifestEntry> = {};
  for (const hash of validHashes) {
    if (entryByHash[hash]) byHash[hash] = entryByHash[hash];
  }

  const manifest: AudioManifest = {
    version: oldManifest?.version ?? 1,
    byText,
    byHash,
  };
  await fs.writeTextFile(
    opts.manifestPath,
    JSON.stringify(manifest, null, 2) + "\n"
  );

  // --- 7. Tính missing: normalized nào thiếu tệp hợp lệ sau khi chạy ---
  for (const [normalized, hash] of normalizedToHash) {
    if (!validHashes.has(hash)) report.missing.push(normalized);
  }

  return report;
}

/**
 * Nạp và parse questions.json qua FsLike — mọi I/O đi qua lớp fs inject được nên
 * test lõi có thể cung cấp dataset hoàn toàn trong bộ nhớ (không cần tệp thật).
 */
async function loadQuestions(
  fs: FsLike,
  questionsPath: string
): Promise<Question[]> {
  const raw = await fs.readTextFile(questionsPath);
  const parsed = JSON.parse(raw) as Question[];
  return parsed;
}

// ---------------------------------------------------------------------------
// Điểm vào CLI (task 4.3): cổng kiểm tra cuối (fail-on-missing) + process.exit.
//
// Phần này KHÔNG động tới lõi `generateAudio` ở trên (lõi vẫn thuần, không gọi
// process.exit — nó chỉ trả GenerateReport). Ở đây CLI đọc report rồi quyết định
// dừng build với mã thoát 1 khi còn văn bản thiếu/tạo lỗi, hoặc khi bất biến
// "số tệp .mp3 == số văn bản duy nhất" bị vi phạm (R2.8, R7.4, R7.5).
// ---------------------------------------------------------------------------

/** Thư mục chứa file script này — dùng để phân giải đường dẫn tuyệt đối từ repo root. */
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
/** Repo root = scripts/audio → lùi 2 cấp (giống scripts/content/generate.ts). */
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");

/** Phân giải GenerateOptions cho lần chạy build-time từ cấu hình + đường dẫn repo. */
function resolveCliOptions(): GenerateOptions {
  const { voice, ratePercent } = loadTtsConfig();
  const outDir = join(REPO_ROOT, "public", "audio");
  return {
    voice,
    ratePercent,
    questionsPath: join(REPO_ROOT, "src", "data", "questions.json"),
    outDir,
    manifestPath: join(outDir, "manifest.json"),
  };
}

/**
 * Đếm số tệp .mp3 hợp lệ hiện có trong `outDir` sau khi chạy generator — dùng để
 * kiểm tra bất biến R7.4 (số tệp == số văn bản duy nhất của dataset hiện tại).
 */
async function countMp3Files(fs: FsLike, outDir: string): Promise<number> {
  const files = await fs.listMp3Files(outDir);
  return files.filter((name) => hashFromMp3FileName(name) !== null).length;
}

/** Đếm số văn bản duy nhất (đã chuẩn hóa) của dataset hiện tại từ questions.json. */
async function countUniqueTexts(
  fs: FsLike,
  questionsPath: string
): Promise<number> {
  const questions = await loadQuestions(fs, questionsPath);
  const unique = new Set<string>();
  for (const raw of extractPronounceableTexts(questions)) {
    const normalized = normalizeText(raw);
    if (normalized.length > 0) unique.add(normalized);
  }
  return unique.size;
}

/**
 * Điểm vào CLI: chạy generator thật (Edge TTS + node:fs), log tóm tắt tiếng Việt,
 * rồi áp cổng kiểm tra cuối. Trả về mã thoát (0 = thành công, 1 = thất bại) để
 * caller gọi process.exit — tách phần quyết định khỏi hiệu ứng thoát giúp dễ đọc.
 */
async function main(): Promise<number> {
  const opts = resolveCliOptions();
  const fs = createNodeFs();

  const report = await generateAudio({ ...opts, fs });

  // Tóm tắt ngắn gọn (tiếng Việt) về kết quả lần chạy.
  console.log("Tạo audio hoàn tất:");
  console.log(`  - Tạo mới        : ${report.created.length}`);
  console.log(`  - Tái dùng       : ${report.reused.length}`);
  console.log(`  - Tạo lại        : ${report.regenerated.length}`);
  console.log(`  - Xóa mồ côi     : ${report.removedOrphans.length}`);

  let failed = false;

  // Cổng 1: có mục tạo lỗi → liệt kê đầy đủ kèm lý do (R2.8).
  if (report.failed.length > 0) {
    failed = true;
    console.error(
      `\nLỖI: ${report.failed.length} văn bản không tạo được audio:`
    );
    for (const item of report.failed) {
      console.error(`  - "${item.text}" (${item.reason})`);
    }
  }

  // Cổng 2: còn văn bản thiếu tệp hợp lệ → liệt kê đầy đủ (R2.8, R7.5).
  if (report.missing.length > 0) {
    failed = true;
    console.error(
      `\nLỖI: còn ${report.missing.length} văn bản thiếu audio hợp lệ:`
    );
    for (const text of report.missing) {
      console.error(`  - "${text}"`);
    }
  }

  // Cổng 3: bất biến số tệp .mp3 == số văn bản duy nhất (R7.4).
  const mp3Count = await countMp3Files(fs, opts.outDir);
  const uniqueCount = await countUniqueTexts(fs, opts.questionsPath);
  if (mp3Count !== uniqueCount) {
    failed = true;
    console.error(
      `\nLỖI: số tệp .mp3 (${mp3Count}) không bằng số văn bản duy nhất (${uniqueCount}).`
    );
  }

  if (failed) {
    console.error("\nBuild bị dừng do audio chưa đầy đủ.");
    return 1;
  }

  console.log(`\nOK: ${uniqueCount} văn bản đều có audio hợp lệ.`);
  return 0;
}

// Chỉ chạy main() khi file được thực thi trực tiếp (tsx scripts/audio/generate-audio.ts),
// KHÔNG chạy khi được import bởi test. So khớp đường dẫn thực (realpath) của file
// hiện tại — từ import.meta.url — với script Node/tsx được gọi (process.argv[1]).
// Dùng realpath để bỏ qua khác biệt symlink (vd /tmp → /private/tmp trên macOS);
// cùng quy ước fileURLToPath như scripts/content/generate.ts.
function isDirectRun(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  const invoked = argv1.startsWith("file:") ? fileURLToPath(argv1) : argv1;
  const current = fileURLToPath(import.meta.url);
  const resolve = (p: string): string => {
    try {
      return realpathSync(p);
    } catch {
      return p;
    }
  };
  return resolve(invoked) === resolve(current);
}

if (isDirectRun()) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("LỖI không mong đợi khi tạo audio:", err);
      process.exit(1);
    });
}
