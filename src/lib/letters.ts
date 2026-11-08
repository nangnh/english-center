// Hỗ trợ dạng trò chơi chữ cái tự sáng tác: spell-fill và unscramble.
import { stableShuffle } from "./shuffle";

export interface LetterTile {
  id: string;
  letter: string;
}

/**
 * Tạo các ô chữ cái cho unscramble, xáo trộn ổn định theo seed (id câu).
 * Mỗi chữ cái của answerEn thành một ô có id duy nhất (kể cả chữ trùng).
 */
export function buildScrambledTiles(answerEn: string, seed: string): LetterTile[] {
  const tiles: LetterTile[] = answerEn
    .split("")
    .map((letter, i) => ({ id: `t${i}`, letter }));
  const shuffled = stableShuffle(tiles, `${seed}:scramble`);
  // Nếu xáo xong vẫn trùng thứ tự gốc (từ quá ngắn), đảo nhẹ để không lộ đáp án.
  const joined = shuffled.map((t) => t.letter).join("");
  if (joined === answerEn && shuffled.length > 1) {
    return [shuffled[shuffled.length - 1], ...shuffled.slice(0, -1)];
  }
  return shuffled;
}

/** Ghép chuỗi đáp án unscramble từ thứ tự ô đã chọn. */
export function assembleUnscramble(
  tiles: LetterTile[],
  order: string[]
): string {
  const byId = new Map(tiles.map((t) => [t.id, t.letter]));
  return order.map((id) => byId.get(id) ?? "").join("");
}

/**
 * Hiển thị spell-fill: trả về mảng ký tự, vị trí khuyết thay bằng null.
 * Vd answerEn="cat", blankIndexes=[1] -> ["c", null, "t"].
 */
export function maskedWord(
  answerEn: string,
  blankIndexes: number[]
): Array<string | null> {
  const blanks = new Set(blankIndexes);
  return answerEn.split("").map((ch, i) => (blanks.has(i) ? null : ch));
}

/** Chuẩn hoá chữ cái: trim + lowercase, giữ nguyên ký tự. */
export function normalizeLetter(ch: string): string {
  return ch.trim().toLowerCase();
}
