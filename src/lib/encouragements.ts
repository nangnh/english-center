// Nguồn chung câu động viên tiếng Anh (single source of truth).
// Cả src/lib/sound.ts (runtime chọn/hiển thị) và TTS_Generator (build-time trích
// để tạo audio) đều import từ đây, bảo đảm mọi câu hiển thị đều có audio tương ứng.
// Module thuần dữ liệu, KHÔNG phụ thuộc DOM/Node.

/**
 * Lời động viên tiếng Anh ngắn, thân thiện trẻ em, phát khi trả lời sai (R8.1).
 * Đây là các Encouragement_Message và cũng là Pronounceable_Text: TTS_Generator
 * trích mảng này để tạo sẵn audio tiếng Anh bản ngữ (R8.5).
 * KHÔNG chứa chuỗi tiếng Việt — ứng dụng không phát TTS tiếng Việt (R8.6).
 */
export const ENCOURAGEMENTS: readonly string[] = [
  "Keep going!",
  "Almost there, try again!",
  "Great effort!",
  "You can do it!",
];

/**
 * Chọn một câu động viên theo seed (xoay vòng, xác định với cùng seed).
 * Giữ nguyên hành vi của pickEncouragement cũ trong sound.ts: mặc định dùng
 * Date.now() và index theo Math.abs(seed) % length.
 */
export function pickEncouragement(seed: number = Date.now()): string {
  return ENCOURAGEMENTS[Math.abs(seed) % ENCOURAGEMENTS.length];
}
