import { describe, it, expect } from "vitest";
import {
  buildScrambledTiles,
  assembleUnscramble,
  maskedWord,
} from "@/lib/letters";
import { evaluate } from "@/lib/scoring";
import type { SpellFillQuestion, UnscrambleQuestion } from "@/types";

describe("letters lib", () => {
  it("maskedWord che đúng vị trí khuyết", () => {
    expect(maskedWord("cat", [1])).toEqual(["c", null, "t"]);
    expect(maskedWord("fish", [1, 3])).toEqual(["f", null, "s", null]);
  });

  it("buildScrambledTiles ổn định theo seed và không giữ nguyên thứ tự gốc", () => {
    const a = buildScrambledTiles("apple", "u-001");
    const b = buildScrambledTiles("apple", "u-001");
    expect(a).toEqual(b); // ổn định
    expect(a.map((t) => t.letter).join("")).not.toBe("apple"); // đã xáo
    expect(a.length).toBe(5);
  });

  it("assembleUnscramble ghép theo thứ tự id", () => {
    const tiles = buildScrambledTiles("cat", "x");
    const order = tiles.map((t) => t.id); // giữ nguyên thứ tự tile
    expect(assembleUnscramble(tiles, order)).toBe(
      tiles.map((t) => t.letter).join("")
    );
  });
});

const spellQ: SpellFillQuestion = {
  id: "s1",
  kind: "spell-fill",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  answerEn: "cat",
  blankIndexes: [1],
  explanationVi: "x",
};

const unscrambleQ: UnscrambleQuestion = {
  id: "u1",
  kind: "unscramble",
  topic: "animals",
  difficulty: 1,
  promptVi: "x",
  answerEn: "dog",
  explanationVi: "x",
};

describe("chấm spell-fill (R2/R3)", () => {
  it("điền đúng chữ khuyết -> đúng, không phân biệt hoa thường", () => {
    expect(
      evaluate(spellQ, { kind: "spell-fill", letters: { 1: "A" } }).correct
    ).toBe(true);
    expect(
      evaluate(spellQ, { kind: "spell-fill", letters: { 1: "a" } }).correct
    ).toBe(true);
  });

  it("điền sai hoặc thiếu -> sai", () => {
    expect(
      evaluate(spellQ, { kind: "spell-fill", letters: { 1: "o" } }).correct
    ).toBe(false);
    expect(
      evaluate(spellQ, { kind: "spell-fill", letters: {} }).correct
    ).toBe(false);
  });
});

describe("chấm unscramble (R2/R3)", () => {
  it("ghép đúng từ -> đúng", () => {
    const tiles = buildScrambledTiles("dog", "u1");
    // Dựng thứ tự id tạo thành "dog" (xử lý cả chữ trùng bằng bộ đếm).
    const byLetter = new Map<string, string[]>();
    for (const t of tiles) {
      byLetter.set(t.letter, [...(byLetter.get(t.letter) ?? []), t.id]);
    }
    const counts: Record<string, number> = {};
    const order = "dog".split("").map((ch) => {
      const ids = byLetter.get(ch)!;
      const idx = counts[ch] ?? 0;
      counts[ch] = idx + 1;
      return ids[idx];
    });
    expect(
      evaluate(unscrambleQ, { kind: "unscramble", order }).correct
    ).toBe(true);
  });

  it("sai thứ tự -> sai", () => {
    const tiles = buildScrambledTiles("dog", "u1");
    const order = tiles.map((t) => t.id); // thứ tự xáo trộn (không phải dog)
    const assembled = order.map((id) => tiles.find((t) => t.id === id)!.letter).join("");
    const result = evaluate(unscrambleQ, { kind: "unscramble", order });
    expect(result.correct).toBe(assembled === "dog");
  });

  it("thiếu chữ -> sai", () => {
    const tiles = buildScrambledTiles("dog", "u1");
    expect(
      evaluate(unscrambleQ, {
        kind: "unscramble",
        order: [tiles[0].id, tiles[1].id],
      }).correct
    ).toBe(false);
  });
});
