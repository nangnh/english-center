// Kiểu dữ liệu lõi cho English Garden.
// Question là discriminated union theo 5 dạng câu hỏi (design.md).

export type Topic =
  | "alphabet"
  | "colors"
  | "animals"
  | "family"
  | "school-things"
  | "numbers"
  | "food";

export const TOPICS: Topic[] = [
  "alphabet",
  "colors",
  "animals",
  "family",
  "school-things",
  "numbers",
  "food",
];

export const TOPIC_LABELS_VI: Record<Topic, string> = {
  alphabet: "Bảng chữ cái",
  colors: "Màu sắc",
  animals: "Động vật",
  family: "Gia đình",
  "school-things": "Đồ dùng học tập",
  numbers: "Số 1–20",
  food: "Thức ăn",
};

export type QuestionKind =
  | "choice"
  | "picture-choice"
  | "matching"
  | "fill"
  | "listening-choice"
  | "spell-fill"
  | "unscramble";

export const QUESTION_KINDS: QuestionKind[] = [
  "choice",
  "picture-choice",
  "matching",
  "fill",
  "listening-choice",
  "spell-fill",
  "unscramble",
];

export const QUESTION_KIND_LABELS_VI: Record<QuestionKind, string> = {
  choice: "Chọn đáp án",
  "picture-choice": "Chọn tranh",
  matching: "Nối cặp",
  fill: "Điền chữ/từ",
  "listening-choice": "Nghe chọn đáp án",
  "spell-fill": "Điền chữ còn thiếu",
  unscramble: "Sắp xếp chữ cái",
};

export type Difficulty = 1 | 2 | 3;

interface QuestionBase {
  id: string;
  topic: Topic;
  difficulty: Difficulty;
  promptVi: string; // hướng dẫn tiếng Việt
  explanationVi: string; // giải thích tiếng Việt ngắn
}

export interface ChoiceOption {
  id: string;
  textEn: string;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: "choice";
  questionEn: string; // nội dung tiếng Anh của câu hỏi
  options: ChoiceOption[];
  correctOptionId: string;
}

export interface PictureOption {
  id: string;
  asset: string; // đường dẫn SVG trong /illustrations
  alt: string; // mô tả truy cập
}

export interface PictureChoiceQuestion extends QuestionBase {
  kind: "picture-choice";
  questionEn: string;
  options: PictureOption[];
  correctOptionId: string;
}

export interface MatchingPair {
  id: string;
  leftEn: string; // từ tiếng Anh
  rightVi: string; // nghĩa tiếng Việt
}

export interface MatchingQuestion extends QuestionBase {
  kind: "matching";
  pairs: MatchingPair[]; // đúng 3 cặp; tính là 1 câu
}

export interface FillQuestion extends QuestionBase {
  kind: "fill";
  questionEn: string; // câu có chỗ trống, dùng "___"
  acceptedAnswers: string[]; // các đáp án hợp lệ
}

export interface ListeningChoiceQuestion extends QuestionBase {
  kind: "listening-choice";
  speechTextEn: string; // nội dung sẽ được đọc
  options: ChoiceOption[];
  correctOptionId: string;
  // Đề đọc tương đương khi không phát được audio; KHÔNG lộ sớm đáp án.
  readingFallback: {
    promptVi: string;
    questionEn: string;
  };
}

export interface SpellFillQuestion extends QuestionBase {
  kind: "spell-fill";
  answerEn: string; // từ đầy đủ, vd "cat"
  blankIndexes: number[]; // vị trí (0-based) các chữ bị khuyết trong answerEn
}

export interface UnscrambleQuestion extends QuestionBase {
  kind: "unscramble";
  answerEn: string; // từ đích; chữ cái xáo trộn do engine suy ra ổn định
}

export type Question =
  | ChoiceQuestion
  | PictureChoiceQuestion
  | MatchingQuestion
  | FillQuestion
  | ListeningChoiceQuestion
  | SpellFillQuestion
  | UnscrambleQuestion;

export interface Round {
  id: string;
  titleVi: string;
  questionIds: string[]; // 20 câu
  stageSize: 5;
  durationSeconds: 1800;
  passScore: 150;
}

// ---- Trạng thái lượt chơi ----

export type PlayMode = "round" | "quick";

export type AttemptStatus = "idle" | "playing" | "finished";

// Đáp án người dùng theo từng dạng.
export type Answer =
  | { kind: "choice"; optionId: string }
  | { kind: "picture-choice"; optionId: string }
  | { kind: "matching"; links: Record<string, string> } // leftPairId -> rightPairId
  | { kind: "fill"; text: string }
  | { kind: "listening-choice"; optionId: string }
  | { kind: "spell-fill"; letters: Record<number, string> } // vị trí khuyết -> chữ đã điền
  | { kind: "unscramble"; order: string[] }; // danh sách id ô chữ đã chọn theo thứ tự

export interface Evaluation {
  correct: boolean;
  score: number; // 10 nếu đúng, 0 nếu sai
}

export interface Attempt {
  id: string;
  mode: PlayMode;
  roundId?: string;
  topic?: Topic; // chỉ dùng cho luyện nhanh (để luyện lại đúng chủ đề)
  questionIds: string[];
  answersById: Record<string, Answer>;
  evaluationsById: Record<string, Evaluation>;
  currentIndex: number;
  startedAtMs: number;
  deadlineMs?: number; // chỉ có với chế độ vòng (30 phút)
  endedAtMs?: number;
  status: AttemptStatus;
  audioFallbackIds: string[]; // câu nghe đã chuyển sang đọc thay thế
}

export interface BestRecord {
  score: number;
  timeMs: number; // thời gian hoàn thành, dùng để phá hoà
  achievedAtMs: number;
}

export interface Progress {
  schemaVersion: 1;
  unlockedRoundIds: string[];
  bestByRound: Record<string, BestRecord>;
  attempts: Attempt[]; // chỉ giữ 50 lượt gần nhất
  activeAttemptId: string | null;
}
