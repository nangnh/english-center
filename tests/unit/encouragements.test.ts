import { describe, it, expect } from "vitest";
import { ENCOURAGEMENTS, pickEncouragement } from "@/lib/encouragements";
import * as sound from "@/lib/sound";

// Ký tự dấu đặc trưng tiếng Việt: nguyên âm có dấu + đ/Đ.
// Nếu một chuỗi chứa bất kỳ ký tự nào trong đây thì nó là tiếng Việt-hóa.
const VIETNAMESE_DIACRITICS =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

describe("encouragements (native-pronunciation R8.1, R8.6)", () => {
  it("ENCOURAGEMENTS không rỗng", () => {
    expect(ENCOURAGEMENTS.length).toBeGreaterThan(0);
  });

  it("mọi phần tử là chuỗi tiếng Anh ngắn, không chứa dấu tiếng Việt", () => {
    for (const message of ENCOURAGEMENTS) {
      expect(typeof message).toBe("string");
      // Không rỗng sau khi bỏ khoảng trắng.
      expect(message.trim().length).toBeGreaterThan(0);
      // Ngắn (thân thiện trẻ em) — giới hạn hợp lý cho một câu động viên.
      expect(message.length).toBeLessThanOrEqual(40);
      // Không chứa ký tự dấu đặc trưng tiếng Việt => là tiếng Anh.
      expect(VIETNAMESE_DIACRITICS.test(message)).toBe(false);
    }
  });

  it("pickEncouragement luôn trả về một phần tử của ENCOURAGEMENTS", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      expect(ENCOURAGEMENTS).toContain(pickEncouragement(seed));
    }
  });

  it("pickEncouragement xác định với cùng seed", () => {
    for (const seed of [0, 1, 7, 42, 123, -5]) {
      expect(pickEncouragement(seed)).toBe(pickEncouragement(seed));
    }
  });

  it("pickEncouragement chọn xoay vòng theo Math.abs(seed) % length", () => {
    const n = ENCOURAGEMENTS.length;
    for (const seed of [0, 1, 2, n, n + 1, 2 * n + 3, -1, -n - 2]) {
      const expected = ENCOURAGEMENTS[Math.abs(seed) % n];
      expect(pickEncouragement(seed)).toBe(expected);
    }
  });
});

describe("sound.ts dùng nguồn chung (native-pronunciation R8.6)", () => {
  it("re-export pickEncouragement đúng là hàm từ encouragements (single source of truth)", () => {
    // Cùng một tham chiếu hàm => không còn mảng/định nghĩa tiếng Việt cục bộ.
    expect(sound.pickEncouragement).toBe(pickEncouragement);
  });

  it("pickEncouragement từ sound.ts hành xử giống module chung", () => {
    for (const seed of [0, 3, 10, 99, -7]) {
      expect(sound.pickEncouragement(seed)).toBe(pickEncouragement(seed));
      expect(ENCOURAGEMENTS).toContain(sound.pickEncouragement(seed));
    }
  });

  it("sound.ts vẫn export các hiệu ứng Web Audio (không phải TTS tiếng Việt)", () => {
    expect(typeof sound.playCorrectSound).toBe("function");
    expect(typeof sound.playWrongSound).toBe("function");
  });
});
