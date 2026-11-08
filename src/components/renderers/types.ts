import type { Answer, Question } from "@/types";

export interface RendererProps<Q extends Question = Question> {
  question: Q;
  // Đáp án hiện tại người dùng đang chọn (chưa nộp).
  draft: Answer | undefined;
  onDraftChange: (answer: Answer) => void;
  // Khi đã nộp: khóa tương tác và hiển thị đúng/sai.
  locked: boolean;
  correct?: boolean;
  // Chỉ dùng cho listening-choice: đang ở chế độ đọc thay thế hay không.
  audioFallback?: boolean;
}
