// Từ khóa/từ đích tiếng Anh để tự động phát cho mỗi câu (trừ listening).
import type { Question } from "@/types";

/**
 * Trả về chuỗi tiếng Anh nên đọc khi câu hiển thị, hoặc null nếu không nên
 * tự phát (dạng listening tự quản audio riêng để không lộ đáp án).
 */
export function autoSpeakText(question: Question): string | null {
  switch (question.kind) {
    case "choice":
      // Đọc câu hỏi tiếng Anh (vd "Choose the word for ...").
      return question.questionEn;
    case "picture-choice":
      return question.questionEn;
    case "fill":
      // Không đọc (đáp án chính là từ cần điền) -> tránh lộ đáp án.
      return null;
    case "spell-fill":
      // Không đọc toàn bộ từ (sẽ lộ chữ cái cần điền).
      return null;
    case "unscramble":
      // Không đọc (lộ thứ tự chữ) -> để trẻ tự ghép.
      return null;
    case "matching":
      return null; // nhiều từ, không đọc tự động
    case "listening-choice":
      return null; // KHÔNG tự phát (R5)
    default: {
      const _exhaustive: never = question;
      void _exhaustive;
      return null;
    }
  }
}
