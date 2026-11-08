// Xáo trộn ổn định theo seed (không đổi mỗi lần render trong cùng một lượt).
// Giữ nguyên id đáp án đúng; chỉ đổi thứ tự hiển thị.

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Trả về bản sao được xáo trộn ổn định theo seed string. */
export function stableShuffle<T>(items: T[], seed: string): T[] {
  const rng = seededRandom(hashString(seed) || 1);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
