// Kiểm tra tính hợp lệ của ngân hàng câu hỏi và các vòng (R2).
// Logic thuần, không phụ thuộc React.

import type {
  Difficulty,
  Question,
  QuestionKind,
  Round,
  Topic,
} from "@/types";
import { QUESTION_KINDS, TOPICS } from "@/types";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && (TOPICS as string[]).includes(value);
}

function isKind(value: unknown): value is QuestionKind {
  return (
    typeof value === "string" && (QUESTION_KINDS as string[]).includes(value)
  );
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 1 || value === 2 || value === 3;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Kiểm tra một câu hỏi đơn lẻ. Trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateQuestion(q: Question): string[] {
  const errors: string[] = [];
  const where = `Câu "${q?.id ?? "(thiếu id)"}"`;

  if (!nonEmptyString(q.id)) errors.push(`${where}: thiếu id.`);
  if (!isTopic(q.topic)) errors.push(`${where}: topic không hợp lệ.`);
  if (!isKind(q.kind)) errors.push(`${where}: kind không hợp lệ.`);
  if (!isDifficulty(q.difficulty))
    errors.push(`${where}: difficulty phải 1–3.`);
  if (!nonEmptyString(q.promptVi)) errors.push(`${where}: thiếu promptVi.`);
  if (!nonEmptyString(q.explanationVi))
    errors.push(`${where}: thiếu explanationVi.`);

  switch (q.kind) {
    case "choice":
    case "listening-choice": {
      if (q.kind === "choice" && !nonEmptyString(q.questionEn))
        errors.push(`${where}: thiếu questionEn.`);
      if (q.kind === "listening-choice") {
        if (!nonEmptyString(q.speechTextEn))
          errors.push(`${where}: thiếu speechTextEn.`);
        if (
          !q.readingFallback ||
          !nonEmptyString(q.readingFallback.promptVi) ||
          !nonEmptyString(q.readingFallback.questionEn)
        )
          errors.push(`${where}: thiếu readingFallback đầy đủ.`);
      }
      const opts = q.options ?? [];
      if (opts.length < 2)
        errors.push(`${where}: cần ít nhất 2 lựa chọn.`);
      const optIds = new Set<string>();
      for (const o of opts) {
        if (!nonEmptyString(o.id)) errors.push(`${where}: option thiếu id.`);
        if (!nonEmptyString(o.textEn))
          errors.push(`${where}: option "${o.id}" thiếu textEn.`);
        if (optIds.has(o.id))
          errors.push(`${where}: trùng option id "${o.id}".`);
        optIds.add(o.id);
      }
      if (!optIds.has(q.correctOptionId))
        errors.push(`${where}: correctOptionId không nằm trong options.`);
      break;
    }
    case "picture-choice": {
      const opts = q.options ?? [];
      if (opts.length < 2)
        errors.push(`${where}: cần ít nhất 2 lựa chọn tranh.`);
      const optIds = new Set<string>();
      for (const o of opts) {
        if (!nonEmptyString(o.id)) errors.push(`${where}: tranh thiếu id.`);
        if (!nonEmptyString(o.asset))
          errors.push(`${where}: tranh "${o.id}" thiếu asset SVG.`);
        if (!nonEmptyString(o.alt))
          errors.push(`${where}: tranh "${o.id}" thiếu alt truy cập.`);
        if (optIds.has(o.id))
          errors.push(`${where}: trùng id tranh "${o.id}".`);
        optIds.add(o.id);
      }
      if (!optIds.has(q.correctOptionId))
        errors.push(`${where}: correctOptionId không nằm trong tranh.`);
      break;
    }
    case "matching": {
      const pairs = q.pairs ?? [];
      if (pairs.length !== 3)
        errors.push(`${where}: nối cặp phải có đúng 3 cặp.`);
      const pairIds = new Set<string>();
      for (const p of pairs) {
        if (!nonEmptyString(p.id)) errors.push(`${where}: cặp thiếu id.`);
        if (!nonEmptyString(p.leftEn))
          errors.push(`${where}: cặp "${p.id}" thiếu leftEn.`);
        if (!nonEmptyString(p.rightVi))
          errors.push(`${where}: cặp "${p.id}" thiếu rightVi.`);
        if (pairIds.has(p.id))
          errors.push(`${where}: trùng id cặp "${p.id}".`);
        pairIds.add(p.id);
      }
      break;
    }
    case "fill": {
      if (!nonEmptyString(q.questionEn))
        errors.push(`${where}: thiếu questionEn.`);
      const answers = q.acceptedAnswers ?? [];
      if (answers.length < 1)
        errors.push(`${where}: cần ít nhất 1 đáp án chấp nhận.`);
      for (const a of answers) {
        if (!nonEmptyString(a))
          errors.push(`${where}: acceptedAnswers có mục rỗng.`);
      }
      break;
    }
    case "spell-fill": {
      if (!nonEmptyString(q.answerEn))
        errors.push(`${where}: thiếu answerEn.`);
      const blanks = q.blankIndexes ?? [];
      if (blanks.length < 1)
        errors.push(`${where}: cần ít nhất 1 vị trí khuyết.`);
      for (const idx of blanks) {
        if (
          !Number.isInteger(idx) ||
          idx < 0 ||
          idx >= (q.answerEn?.length ?? 0)
        )
          errors.push(`${where}: blankIndex ${idx} ngoài phạm vi answerEn.`);
      }
      if (new Set(blanks).size !== blanks.length)
        errors.push(`${where}: blankIndexes bị lặp.`);
      // Không khuyết toàn bộ chữ (còn gợi ý tối thiểu 1 chữ) khi từ > 1 ký tự.
      if ((q.answerEn?.length ?? 0) > 1 && blanks.length >= q.answerEn.length)
        errors.push(`${where}: không nên khuyết toàn bộ chữ cái.`);
      break;
    }
    case "unscramble": {
      if (!nonEmptyString(q.answerEn))
        errors.push(`${where}: thiếu answerEn.`);
      if ((q.answerEn?.length ?? 0) < 2)
        errors.push(`${where}: answerEn cần ít nhất 2 chữ cái để xáo trộn.`);
      break;
    }
    default: {
      // Bảo đảm xử lý đủ mọi kind.
      const _exhaustive: never = q;
      errors.push(`Câu không rõ dạng: ${JSON.stringify(_exhaustive)}`);
    }
  }

  return errors;
}

/**
 * Kiểm tra toàn bộ ngân hàng + các vòng (R2):
 * - ID câu hỏi duy nhất
 * - mỗi câu hợp lệ
 * - mỗi vòng tham chiếu câu có thật, không lặp ID trong một vòng
 */
export function validateBank(
  questions: Question[],
  rounds: Round[]
): ValidationResult {
  const errors: string[] = [];

  // ID câu hỏi duy nhất
  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) errors.push(`Trùng ID câu hỏi "${q.id}".`);
    seen.add(q.id);
    errors.push(...validateQuestion(q));
  }

  const byId = new Map(questions.map((q) => [q.id, q]));

  for (const r of rounds) {
    const rw = `Vòng "${r.id}"`;
    if (!nonEmptyString(r.id)) errors.push(`${rw}: thiếu id.`);
    if (!nonEmptyString(r.titleVi)) errors.push(`${rw}: thiếu titleVi.`);
    if (r.questionIds.length !== 20)
      errors.push(`${rw}: phải có đúng 20 câu (hiện ${r.questionIds.length}).`);
    if (r.stageSize !== 5) errors.push(`${rw}: stageSize phải là 5.`);
    if (r.durationSeconds !== 1800)
      errors.push(`${rw}: durationSeconds phải là 1800.`);
    if (r.passScore !== 150) errors.push(`${rw}: passScore phải là 150.`);

    const inRound = new Set<string>();
    const kindsInRound = new Set<QuestionKind>();
    for (const qid of r.questionIds) {
      if (inRound.has(qid))
        errors.push(`${rw}: lặp câu "${qid}" trong cùng vòng.`);
      inRound.add(qid);
      const q = byId.get(qid);
      if (!q) {
        errors.push(`${rw}: tham chiếu câu không tồn tại "${qid}".`);
      } else {
        kindsInRound.add(q.kind);
      }
    }
    // Mỗi vòng phải đủ 5 dạng
    for (const k of QUESTION_KINDS) {
      if (!kindsInRound.has(k))
        errors.push(`${rw}: thiếu dạng "${k}".`);
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Thống kê phủ chủ đề và dạng để kiểm tra ngưỡng tối thiểu (R2). */
export function bankCoverage(questions: Question[]) {
  const byTopic: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  for (const q of questions) {
    byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
    byKind[q.kind] = (byKind[q.kind] ?? 0) + 1;
  }
  return { total: questions.length, byTopic, byKind };
}
