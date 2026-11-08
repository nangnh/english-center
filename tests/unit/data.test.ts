import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { QUESTIONS, ROUNDS } from "@/data";
import { validateBank, bankCoverage } from "@/lib/validation";
import { TOPICS, QUESTION_KINDS } from "@/types";

describe("ngân hàng câu hỏi (R2)", () => {
  it("vượt toàn bộ kiểm tra validateBank", () => {
    const result = validateBank(QUESTIONS, ROUNDS);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("có ít nhất 160 câu", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(160);
  });

  it("mỗi chủ đề có ít nhất 15 câu, phủ đủ 7 chủ đề", () => {
    const cov = bankCoverage(QUESTIONS);
    expect(Object.keys(cov.byTopic).sort()).toEqual([...TOPICS].sort());
    for (const t of TOPICS) {
      expect(cov.byTopic[t] ?? 0).toBeGreaterThanOrEqual(15);
    }
  });

  it("mỗi dạng có ít nhất 15 câu, phủ đủ 5 dạng", () => {
    const cov = bankCoverage(QUESTIONS);
    expect(Object.keys(cov.byKind).sort()).toEqual([...QUESTION_KINDS].sort());
    for (const k of QUESTION_KINDS) {
      expect(cov.byKind[k] ?? 0).toBeGreaterThanOrEqual(15);
    }
  });

  it("ID câu hỏi là duy nhất", () => {
    const ids = new Set(QUESTIONS.map((q) => q.id));
    expect(ids.size).toBe(QUESTIONS.length);
  });

  it("có đúng 8 vòng, mỗi vòng 20 câu không lặp ID", () => {
    expect(ROUNDS.length).toBe(8);
    for (const r of ROUNDS) {
      expect(r.questionIds.length).toBe(20);
      expect(new Set(r.questionIds).size).toBe(20);
      expect(r.stageSize).toBe(5);
      expect(r.durationSeconds).toBe(1800);
      expect(r.passScore).toBe(150);
    }
  });

  it("mỗi vòng có đủ 5 dạng câu", () => {
    const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
    for (const r of ROUNDS) {
      const kinds = new Set(
        r.questionIds.map((id) => byId.get(id)?.kind).filter(Boolean)
      );
      for (const k of QUESTION_KINDS) {
        expect(kinds.has(k)).toBe(true);
      }
    }
  });

  it("độ khó trung bình tăng dần theo vòng (tăng nhẹ)", () => {
    const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
    const avg = ROUNDS.map((r) => {
      const ds: number[] = r.questionIds.map(
        (id) => byId.get(id)?.difficulty ?? 0
      );
      return ds.reduce((a, b) => a + b, 0) / ds.length;
    });
    // Nửa cuối khó hơn nửa đầu, và vòng cuối khó hơn vòng đầu.
    const firstHalf = avg.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
    const secondHalf = avg.slice(4).reduce((a, b) => a + b, 0) / 4;
    expect(secondHalf).toBeGreaterThan(firstHalf);
    expect(avg[avg.length - 1]).toBeGreaterThan(avg[0]);
  });

  it("mọi tranh picture-choice đều có file SVG tồn tại", () => {
    const publicDir = join(process.cwd(), "public");
    for (const q of QUESTIONS) {
      if (q.kind === "picture-choice") {
        for (const o of q.options) {
          const p = join(publicDir, o.asset);
          expect(existsSync(p), `Thiếu SVG: ${o.asset}`).toBe(true);
          expect(o.alt.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("câu nối cặp luôn có đúng 3 cặp", () => {
    for (const q of QUESTIONS) {
      if (q.kind === "matching") {
        expect(q.pairs.length).toBe(3);
      }
    }
  });

  it("câu nghe có speechTextEn và readingFallback đầy đủ", () => {
    for (const q of QUESTIONS) {
      if (q.kind === "listening-choice") {
        expect(q.speechTextEn.length).toBeGreaterThan(0);
        expect(q.readingFallback.promptVi.length).toBeGreaterThan(0);
        expect(q.readingFallback.questionEn.length).toBeGreaterThan(0);
      }
    }
  });
});
