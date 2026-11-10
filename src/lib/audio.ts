// Audio_Player (runtime): tra manifest theo văn bản đã chuẩn hóa, phát .mp3 tĩnh
// qua HTMLAudioElement, dừng audio đang phát, áp timeout 3 giây, và suy biến về
// Web Speech API (src/lib/speech.ts) khi thiếu/lỗi (R2.4, R3, R5.2, R6.3).
//
// Logic tách khỏi DOM-cụ-thể để test được, theo đúng phong cách speech.ts
// (inject môi trường qua AudioEnv).

import { normalizeText } from "./audio-key";
import { speak, type SpeechEnv } from "./speech";

/**
 * Manifest tra cứu audio tạo sẵn. Runtime chỉ cần `byText` (khóa = văn bản đã
 * chuẩn hóa → đường dẫn tĩnh "/audio/<hash>.mp3"). Giữ cấu trúc tương thích với
 * manifest của generator (còn có `byHash`) nhưng KHÔNG yêu cầu `byHash` ở runtime.
 */
export interface AudioManifest {
  version: number;
  byText: Record<string, string>; // normalizedText -> "/audio/<hash>.mp3"
}

/**
 * Môi trường inject cho Audio_Player — cho phép thay HTMLAudioElement và
 * SpeechEnv bằng fake khi test (giống getBrowserSpeechEnv của speech.ts).
 */
export interface AudioEnv {
  manifest: AudioManifest;
  createAudio: (src: string) => HTMLAudioElement; // injectable để test
  speechEnv: SpeechEnv;
  now: () => number;
}

export type PlayOutcome =
  | "played-file" // phát mp3 thành công
  | "fallback-spoken" // đã suy biến sang Web Speech và đọc được
  | "unavailable"; // cả hai đều không được -> UI hiện thông báo

/** Ngưỡng chuyển fallback khi phát tệp (R3.2). */
const PLAY_TIMEOUT_MS = 3000;

// Audio hiện đang được module phát; dùng để dừng trước khi phát mới (R6.3).
let currentAudio: HTMLAudioElement | null = null;

/** Dừng audio đang phát (R6.3). An toàn khi không có gì đang phát. */
export function stopCurrent(_env: AudioEnv): void {
  const audio = currentAudio;
  currentAudio = null;
  if (!audio) return;
  try {
    audio.pause();
  } catch {
    // bỏ qua — môi trường có thể không hỗ trợ pause
  }
}

/** Suy biến sang Web Speech cho `rawText`; ánh xạ kết quả sang PlayOutcome. */
function fallbackSpeak(env: AudioEnv, rawText: string): PlayOutcome {
  return speak(env.speechEnv, rawText) === "spoken"
    ? "fallback-spoken"
    : "unavailable";
}

/**
 * Phát một văn bản:
 *   1. key = normalizeText(rawText); src = manifest.byText[key].
 *   2. Miss manifest → fallback speak(rawText) (R3.1): "spoken" → "fallback-spoken",
 *      ngược lại → "unavailable" (R3.4).
 *   3. Hit → stopCurrent (R6.3), tạo HTMLAudioElement(src), play(). Chạy đua giữa
 *      tín hiệu phát được (playing/canplay/play() resolve) và timeout 3s (R3.2).
 *      Lỗi (onerror) HOẶC quá 3s chưa phát → dừng tệp + fallback speak (R3.2);
 *      ánh xạ "fallback-spoken"/"unavailable". Phát được → "played-file".
 *
 * Caller cho câu listening-choice truyền đúng speechTextEn làm rawText nên fallback
 * chỉ đọc văn bản nguồn, không lộ đáp án (R3.5 do caller giữ, không đọc options ở đây).
 */
export function playText(env: AudioEnv, rawText: string): Promise<PlayOutcome> {
  const key = normalizeText(rawText);
  const src = env.manifest.byText[key];

  // Miss manifest → fallback ngay (R3.1 / R3.4).
  if (!src) {
    return Promise.resolve(fallbackSpeak(env, rawText));
  }

  // Hit → dừng audio cũ rồi phát tệp (R6.3).
  stopCurrent(env);

  return new Promise<PlayOutcome>((resolve) => {
    let audio: HTMLAudioElement;
    try {
      audio = env.createAudio(src);
    } catch {
      // Không tạo được audio tệp → fallback (R3.2).
      resolve(fallbackSpeak(env, rawText));
      return;
    }

    currentAudio = audio;

    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("canplay", onPlaying);
      audio.removeEventListener("error", onError);
    };

    // Phát được → played-file (R2.4).
    const onPlaying = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve("played-file");
    };

    // Lỗi tải/phát HOẶC quá 3s chưa phát → dừng tệp + fallback (R3.2).
    const fallback = () => {
      if (settled) return;
      settled = true;
      cleanup();
      stopCurrent(env);
      resolve(fallbackSpeak(env, rawText));
    };

    const onError = () => fallback();

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("canplay", onPlaying);
    audio.addEventListener("error", onError);

    // Timeout 3s dựa trên env.now()/setTimeout; quá hạn chưa phát → fallback (R3.2).
    const startedAt = env.now();
    timeoutId = setTimeout(() => {
      if (settled) return;
      if (env.now() - startedAt >= PLAY_TIMEOUT_MS) {
        fallback();
      }
    }, PLAY_TIMEOUT_MS);

    // play() có thể trả Promise bị reject (autoplay/giải mã lỗi) → fallback.
    try {
      const p = audio.play() as unknown;
      if (p && typeof (p as Promise<void>).then === "function") {
        (p as Promise<void>).then(onPlaying, fallback);
      }
    } catch {
      fallback();
    }
  });
}

/**
 * Phát một lời động viên (Encouragement_Message) theo kiểu "fire-and-forget".
 *
 * Dùng ĐÚNG cùng đường đi phát âm như mọi Pronounceable_Text khác: ủy quyền cho
 * `playText`, nên câu động viên được tra `manifest.byText` → phát `.mp3` tĩnh, và
 * khi miss/lỗi/quá hạn thì suy biến về Web Speech API đọc chính câu động viên đó
 * (tái dùng chuỗi manifest → mp3 → Web Speech fallback của `playText` — R8.2, R8.3).
 *
 * Hàm là KHÔNG CHẶN (non-blocking): nó trả về `void` ngay lập tức và KHÔNG BAO GIỜ
 * ném lỗi, cũng không trả về giá trị ảnh hưởng tới luồng xử lý câu hỏi. Mọi
 * `PlayOutcome` ("played-file" | "fallback-spoken" | "unavailable") đều được bỏ
 * qua một cách an toàn, và mọi lỗi — kể cả khi `playText` ném đồng bộ — đều được
 * nuốt để việc phát hay thất bại khi phát không bao giờ làm gián đoạn phiên học
 * (R8.4). Trạng thái câu hỏi hiện tại luôn được giữ nguyên.
 */
export function playEncouragement(env: AudioEnv, text: string): void {
  try {
    // Nuốt mọi rejection của Promise; không await để không chặn luồng câu hỏi.
    void playText(env, text).catch(() => {});
  } catch {
    // Phòng thủ: kể cả khi playText ném đồng bộ, không để lỗi lan ra ngoài.
  }
}
