// Trích xuất Pronounceable_Text (văn bản tiếng Anh phát được) từ bộ dữ liệu câu
// hỏi, theo bảng quy tắc trong design.md (mục "scripts/audio/extract.ts").
// Chạy ở build-time dưới tsx -> dùng import đường dẫn tương đối với đuôi ".js"
// (cùng phong cách scripts/content/generate.ts).

import type { Question } from "../../src/types/index.js";
import { ENCOURAGEMENTS } from "../../src/lib/encouragements.js";

/**
 * Văn bản thô (chưa chuẩn hóa) phát được, trích từ dataset câu hỏi, theo từng
 * dạng câu. Chỉ lấy các trường tiếng Anh thực sự dùng để phát âm cho Learner:
 *
 * - `listening-choice` → `speechTextEn` (KHÔNG lấy `options[].textEn` vì là
 *   tiếng Việt và sẽ lộ đáp án — R3.5).
 * - `choice`           → `options[].textEn` (các từ tiếng Anh). `questionEn` là
 *   câu lệnh tiếng Việt-hóa nên KHÔNG lấy.
 * - `matching`         → `pairs[].leftEn` (từ tiếng Anh). `rightVi` là tiếng
 *   Việt nên bỏ.
 * - `spell-fill`       → `answerEn` (từ đầy đủ — R1.6 phát trọn vẹn một lần).
 * - `unscramble`       → `answerEn`.
 * - `fill`             → (không có văn bản tiếng Anh độc lập để phát).
 * - `picture-choice`   → (không phát âm; dùng tranh).
 */
export function extractQuestionTexts(questions: Question[]): string[] {
  const texts: string[] = [];

  for (const question of questions) {
    switch (question.kind) {
      case "listening-choice":
        // Chỉ văn bản nguồn được đọc; KHÔNG lấy options (tiếng Việt, lộ đáp án).
        texts.push(question.speechTextEn);
        break;
      case "choice":
        // Các từ tiếng Anh của lựa chọn; bỏ qua questionEn (tiếng Việt-hóa).
        for (const option of question.options) {
          texts.push(option.textEn);
        }
        break;
      case "matching":
        // Từ tiếng Anh ở vế trái; bỏ rightVi (tiếng Việt).
        for (const pair of question.pairs) {
          texts.push(pair.leftEn);
        }
        break;
      case "spell-fill":
        texts.push(question.answerEn);
        break;
      case "unscramble":
        texts.push(question.answerEn);
        break;
      case "fill":
        // Không có văn bản tiếng Anh độc lập để phát.
        break;
      case "picture-choice":
        // Không phát âm; dùng tranh.
        break;
      default: {
        const _exhaustive: never = question;
        void _exhaustive;
        break;
      }
    }
  }

  return texts;
}

/**
 * Toàn bộ Pronounceable_Text thô: văn bản câu hỏi + mọi Encouragement_Message
 * tiếng Anh (R8.5). Generator dùng hàm này làm nguồn đầu vào duy nhất, nhờ đó
 * mọi câu động viên hiển thị lúc runtime chắc chắn nằm trong tập tạo sẵn.
 */
export function extractPronounceableTexts(questions: Question[]): string[] {
  return [...extractQuestionTexts(questions), ...ENCOURAGEMENTS];
}
