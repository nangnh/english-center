// Web Speech API (speechSynthesis) tiếng Anh, tốc độ chậm (R5).
// Logic tách khỏi UI để test được bằng mock.

export interface SpeechEnv {
  synth: SpeechSynthesis | null;
  makeUtterance: (text: string) => SpeechSynthesisUtterance;
}

/** Lấy môi trường speech thực của trình duyệt, hoặc null nếu không có. */
export function getBrowserSpeechEnv(): SpeechEnv {
  if (
    typeof window === "undefined" ||
    typeof window.speechSynthesis === "undefined" ||
    typeof window.SpeechSynthesisUtterance === "undefined"
  ) {
    return { synth: null, makeUtterance: () => ({}) as SpeechSynthesisUtterance };
  }
  return {
    synth: window.speechSynthesis,
    makeUtterance: (text: string) => new window.SpeechSynthesisUtterance(text),
  };
}

const EN_LANG = /^en(-|$)/i;

/** Có giọng tiếng Anh dùng được không. */
export function hasEnglishVoice(env: SpeechEnv): boolean {
  if (!env.synth) return false;
  try {
    const voices = env.synth.getVoices();
    return voices.some((v) => EN_LANG.test(v.lang));
  } catch {
    return false;
  }
}

export function pickEnglishVoice(
  env: SpeechEnv
): SpeechSynthesisVoice | undefined {
  if (!env.synth) return undefined;
  const voices = env.synth.getVoices();
  return (
    voices.find((v) => /^en-US/i.test(v.lang)) ??
    voices.find((v) => /^en-GB/i.test(v.lang)) ??
    voices.find((v) => EN_LANG.test(v.lang))
  );
}

export type SpeakResult = "spoken" | "unavailable" | "error";

/**
 * Đọc một đoạn tiếng Anh. Hủy phát trước đó, tốc độ ~0.8.
 * Trả về trạng thái để UI quyết định hiển thị fallback.
 */
export function speak(env: SpeechEnv, text: string): SpeakResult {
  if (!env.synth || !hasEnglishVoice(env)) return "unavailable";
  try {
    env.synth.cancel(); // hủy phát trước đó
    const u = env.makeUtterance(text);
    u.lang = "en-US";
    u.rate = 0.8;
    const voice = pickEnglishVoice(env);
    if (voice) u.voice = voice;
    env.synth.speak(u);
    return "spoken";
  } catch {
    return "error";
  }
}

export function cancelSpeech(env: SpeechEnv): void {
  try {
    env.synth?.cancel();
  } catch {
    // bỏ qua
  }
}
