// Chuẩn hóa & băm dùng chung cho audio phát âm (nền tảng R7).
// Module thuần, KHÔNG phụ thuộc DOM. Được import từ cả TTS_Generator (build-time)
// lẫn Audio_Player (runtime) để khóa tra cứu manifest luôn khớp tuyệt đối.

import { createHash } from "crypto";

/**
 * Chuẩn hóa văn bản: cắt khoảng trắng hai đầu + gộp mọi chuỗi khoảng trắng
 * liên tiếp thành đúng một dấu cách. KHÔNG đổi hoa/thường — phát âm "A" khác "a"
 * trong ngữ cảnh bảng chữ cái nên giữ nguyên để an toàn (R7.1).
 */
export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Băm xác định của văn bản ĐÃ chuẩn hóa → chuỗi hex 16 ký tự.
 * Dùng SHA-256 (qua `crypto` của Node) ở build-time để đặt tên tệp ổn định và
 * so khớp tái dùng (R7.2). Runtime KHÔNG cần băm — chỉ `normalizeText` rồi tra
 * `manifest.byText[normalized]`.
 */
export function hashText(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Đường dẫn tệp audio công khai cho một hash → "/audio/<hash>.mp3".
 * Tài sản tĩnh cùng origin phục vụ trực tiếp từ `public/audio/` sau `next build`.
 */
export function audioPathForHash(hash: string): string {
  return `/audio/${hash}.mp3`;
}
