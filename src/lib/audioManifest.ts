// Bộ truy cập Audio_Manifest ở runtime.
//
// Manifest (`public/audio/manifest.json`) được TTS_Generator sinh ra ở bước
// build (prebuild). Vì tệp đó CHƯA tồn tại cho tới khi build chạy (và việc
// sinh cần mạng), ta KHÔNG import tĩnh tệp JSON — làm vậy sẽ phá typecheck/
// build khi tệp vắng mặt. Thay vào đó, bộ truy cập này tải manifest ở runtime
// qua `fetch("/audio/manifest.json")` một lần (cache trong một Promise mức
// module) và suy biến an toàn về manifest rỗng khi không tải được.
//
// Chỉ tệp JSON nhỏ này được tải lazily; KHÔNG bao giờ preload các tệp `.mp3`
// — thỏa R5.5 (không tải trước hàng loạt lúc mở trang).

import type { AudioManifest } from "./audio";

/** Manifest rỗng an toàn khi tệp chưa tồn tại / không tải được. */
const EMPTY_MANIFEST: AudioManifest = { version: 1, byText: {} };

/** Đường dẫn tĩnh cùng origin tới manifest tạo sẵn. */
const MANIFEST_URL = "/audio/manifest.json";

// Cache mức module: chỉ tải manifest đúng một lần cho cả vòng đời trang.
let manifestPromise: Promise<AudioManifest> | null = null;

/** Kiểm tra tối thiểu cấu trúc manifest tải về trước khi tin dùng. */
function isAudioManifest(value: unknown): value is AudioManifest {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.version === "number" &&
    typeof m.byText === "object" &&
    m.byText !== null
  );
}

/**
 * Lấy Audio_Manifest ở runtime (cache theo module).
 *
 * Trả về manifest thật khi `/audio/manifest.json` tải được và hợp lệ; nếu không
 * (tệp vắng mặt khi build chưa chạy, lỗi mạng, JSON hỏng, hoặc chạy phía server/
 * không có `fetch`) thì suy biến về `EMPTY_MANIFEST`. Mọi tra cứu với manifest
 * rỗng sẽ "miss" và Audio_Player tự suy biến sang Web Speech (R3.1).
 */
export function getAudioManifest(): Promise<AudioManifest> {
  if (manifestPromise) return manifestPromise;

  // Không có fetch (SSR / môi trường không hỗ trợ) → manifest rỗng.
  if (typeof fetch === "undefined") {
    manifestPromise = Promise.resolve(EMPTY_MANIFEST);
    return manifestPromise;
  }

  manifestPromise = fetch(MANIFEST_URL)
    .then((res) => (res.ok ? res.json() : EMPTY_MANIFEST))
    .then((data) => (isAudioManifest(data) ? data : EMPTY_MANIFEST))
    .catch(() => EMPTY_MANIFEST);

  return manifestPromise;
}
