// Lớp cấu hình TTS cho TTS_Generator (build-time, Node).
// Đọc tùy chọn giọng/tốc độ từ biến môi trường; không nhúng khóa truy cập vào mã nguồn.
// Mặc định dùng Microsoft Edge TTS miễn phí (msedge-tts) — không cần khóa truy cập.
// Nếu về sau đổi sang nhà cung cấp cần khóa, khóa được đọc từ env (TTS_API_KEY),
// KHÔNG lưu literal trong mã quản lý phiên bản (R4.3, R4.4).
//
// _Requirements: 1.4, 1.5, 4.1, 4.3_

/** Giọng mặc định: tiếng Anh bản ngữ neural, mã ngôn ngữ en-US (R1.4). */
export const DEFAULT_TTS_VOICE = "en-US-AriaNeural";

/** Tốc độ đọc mặc định theo phần trăm tốc độ gốc của giọng (R1.5). */
export const DEFAULT_TTS_RATE_PERCENT = 85;

/** Khoảng tốc độ đọc hợp lệ: 80%–90% tốc độ gốc (R1.5). */
export const MIN_TTS_RATE_PERCENT = 80;
export const MAX_TTS_RATE_PERCENT = 90;

/** Cấu hình TTS đã phân giải mà TTS_Generator (task 4.2) tiêu thụ. */
export interface TtsConfig {
  /** Tên giọng (ShortName) truyền cho msedge-tts, ví dụ "en-US-AriaNeural". */
  voice: string;
  /**
   * Tốc độ đọc theo phần trăm tốc độ gốc, số nguyên trong [80, 90].
   * Generator chuyển giá trị này thành SSML prosody `rate` qua {@link ssmlRate}.
   */
  ratePercent: number;
  /**
   * Khóa truy cập tùy chọn, đọc từ env. `undefined` khi không cấu hình.
   * Edge TTS mặc định KHÔNG cần khóa nên trường này thường là `undefined`.
   */
  apiKey?: string;
}

/**
 * Ép một giá trị tốc độ về số nguyên phần trăm trong [80, 90] (R1.5).
 * Giá trị không hợp lệ (NaN) → về mặc định; ngoài khoảng → kẹp vào biên gần nhất.
 */
export function clampRatePercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TTS_RATE_PERCENT;
  const rounded = Math.round(value);
  if (rounded < MIN_TTS_RATE_PERCENT) return MIN_TTS_RATE_PERCENT;
  if (rounded > MAX_TTS_RATE_PERCENT) return MAX_TTS_RATE_PERCENT;
  return rounded;
}

/**
 * Chuyển tốc độ phần trăm (theo tốc độ gốc) thành chuỗi SSML prosody `rate`
 * tương đối mà msedge-tts chấp nhận. Ví dụ 85% → "-15%", 80% → "-20%".
 * (ratePercent là phần trăm TỐC ĐỘ gốc; chuỗi SSML là độ lệch tương đối so với 100%.)
 */
export function ssmlRate(ratePercent: number): string {
  const clamped = clampRatePercent(ratePercent);
  const delta = clamped - 100; // luôn <= 0 trong khoảng [80,90]
  return `${delta >= 0 ? "+" : ""}${delta}%`;
}

/** Nguồn đọc biến môi trường — mặc định `process.env`, cho phép inject khi test. */
export type EnvSource = Record<string, string | undefined>;

/**
 * Phân giải {@link TtsConfig} từ biến môi trường (build-time):
 *  - `TTS_VOICE`   : tên giọng; rỗng/không đặt → {@link DEFAULT_TTS_VOICE}.
 *  - `TTS_RATE`    : tốc độ phần trăm; rỗng/không hợp lệ → {@link DEFAULT_TTS_RATE_PERCENT};
 *                    luôn được kẹp vào [80, 90] (R1.5).
 *  - `TTS_API_KEY` : khóa truy cập tùy chọn; chỉ đọc từ env, không literal trong source (R4.3).
 *
 * Edge TTS miễn phí không cần khóa (R4.1), nên thiếu `TTS_API_KEY` KHÔNG phải lỗi ở đây.
 * Việc bắt buộc khóa (nếu đổi sang provider cần khóa) thuộc về generator (R4.4).
 */
export function loadTtsConfig(env: EnvSource = process.env): TtsConfig {
  const rawVoice = env.TTS_VOICE?.trim();
  const voice = rawVoice && rawVoice.length > 0 ? rawVoice : DEFAULT_TTS_VOICE;

  const rawRate = env.TTS_RATE?.trim();
  const ratePercent =
    rawRate && rawRate.length > 0
      ? clampRatePercent(Number(rawRate))
      : DEFAULT_TTS_RATE_PERCENT;

  const rawKey = env.TTS_API_KEY?.trim();
  const apiKey = rawKey && rawKey.length > 0 ? rawKey : undefined;

  return { voice, ratePercent, apiKey };
}
