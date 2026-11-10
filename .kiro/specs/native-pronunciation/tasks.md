# Implementation Plan: native-pronunciation

## Overview

Triển khai phát âm tiếng Anh bản ngữ bằng tệp `.mp3` tạo sẵn ở bước build, với suy biến về Web Speech API. Kế hoạch đi từ các module thuần dùng chung (`audio-key`, `encouragements`), tới trích xuất văn bản, tới TTS_Generator build-time, tới Audio_Player runtime, tới UI AudioButton, rồi nối lời động viên vào luồng trả lời sai, và cuối cùng là tích hợp build + xác minh. Mỗi bước xây trên bước trước và kết thúc bằng việc nối dây (wiring) vào hệ thống hiện có — không để lại mã mồ côi.

Ngôn ngữ: TypeScript (theo đúng thiết kế và codebase hiện tại). Test chạy bằng Vitest + `fast-check`; mỗi property test tối thiểu 100 vòng và gắn nhãn `Feature: native-pronunciation, Property N`.

## Tasks

- [x] 1. Thiết lập nền tảng test và module khóa chung
  - [x] 1.1 Thêm `fast-check` vào devDependencies và kiểm tra Vitest nhận PBT
    - Thêm `fast-check` vào `devDependencies` trong `package.json`
    - Viết một test "smoke" nhỏ chạy `fc.assert(fc.property(...), { numRuns: 100 })` để xác nhận cấu hình PBT hoạt động với Vitest hiện có
    - _Requirements: 7.1_

  - [x] 1.2 Cài đặt `src/lib/audio-key.ts` (normalizeText, hashText, audioPathForHash)
    - `normalizeText(text)` = `text.trim().replace(/\s+/g, " ")`, không đổi hoa/thường
    - `hashText(normalized)` dùng `crypto` SHA-256, cắt 16 ký tự hex (dùng ở build-time để đặt tên tệp/so khớp tái dùng)
    - `audioPathForHash(hash)` trả về `/audio/<hash>.mp3`
    - Module thuần, không phụ thuộc DOM
    - _Requirements: 7.1, 7.2, 2.3_

  - [x] 1.3 Viết property test cho `audio-key.ts`
    - **Property 2: Chuẩn hóa xác định và lũy đẳng**
    - **Validates: Requirements 7.1**
    - Với `fc.string()` (gồm chuỗi nhiều khoảng trắng): `normalizeText` xác định, `normalizeText(normalizeText(s)) === normalizeText(s)`, kết quả không có khoảng trắng đầu/cuối và không có chuỗi khoảng trắng liên tiếp
    - Tối thiểu 100 vòng, có comment nhãn property

- [x] 2. Nguồn chung câu động viên tiếng Anh
  - [x] 2.1 Tạo `src/lib/encouragements.ts`
    - Export `ENCOURAGEMENTS: readonly string[]` gồm câu tiếng Anh ngắn, thân thiện trẻ em ("Keep going!", "Almost there, try again!", "Great effort!", "You can do it!")
    - Export `pickEncouragement(seed?)` chọn xoay vòng, xác định với cùng seed
    - Module thuần, không phụ thuộc DOM/Node
    - _Requirements: 8.1, 8.5_

  - [x] 2.2 Cập nhật `src/lib/sound.ts` dùng module chung
    - Gỡ mảng `ENCOURAGEMENTS` tiếng Việt và `pickEncouragement` cục bộ
    - Re-export/`import` `pickEncouragement` từ `src/lib/encouragements.ts`
    - Giữ nguyên `playCorrectSound`/`playWrongSound` (hiệu ứng Web Audio, không phải TTS tiếng Việt)
    - _Requirements: 8.1, 8.5, 8.6_

  - [x] 2.3 Viết unit test cho `encouragements.ts` và `sound.ts`
    - `ENCOURAGEMENTS` không rỗng; mọi phần tử là tiếng Anh ngắn (không chứa ký tự dấu tiếng Việt)
    - `sound.ts` không còn định nghĩa chuỗi tiếng Việt cục bộ; `pickEncouragement` đến từ module chung
    - _Requirements: 8.1, 8.6_

- [x] 3. Trích xuất Pronounceable_Text
  - [x] 3.1 Cài đặt `scripts/audio/extract.ts`
    - `extractQuestionTexts(questions)` trích các trường tiếng Anh theo bảng quy tắc theo dạng câu: `listening-choice` → `speechTextEn` (KHÔNG lấy `options[].textEn`), `choice` → `options[].textEn`, `matching` → `pairs[].leftEn`, `spell-fill`/`unscramble` → `answerEn`; bỏ `rightVi` và câu lệnh `questionEn` tiếng Việt-hóa
    - `extractPronounceableTexts(questions)` = `[...extractQuestionTexts(questions), ...ENCOURAGEMENTS]` (import `ENCOURAGEMENTS` từ `src/lib/encouragements`)
    - _Requirements: 2.1, 7.1, 8.5_

  - [x] 3.2 Viết property test cho trích xuất
    - **Property 17: Mọi Pronounceable_Text là tiếng Anh (không nguồn tiếng Việt)**
    - **Validates: Requirements 8.1, 8.6**
    - Sinh `Question` ngẫu nhiên bằng `fast-check`; khẳng định mọi chuỗi trả về không rỗng sau `normalizeText` và không chứa ký tự dấu đặc trưng tiếng Việt (nguyên âm có dấu, `đ/Đ`)
    - Tối thiểu 100 vòng, có comment nhãn property

  - [ ]* 3.3 Viết ví dụ loại trừ đáp án câu nghe
    - Khẳng định `extractQuestionTexts` không bao giờ lấy `options[].textEn` của `listening-choice` hay `rightVi`/`questionEn` tiếng Việt-hóa
    - _Requirements: 3.5_

- [x] 4. TTS_Generator (build-time)
  - [x] 4.1 Thêm dependency `msedge-tts` và lớp cấu hình giọng/tốc độ
    - Thêm `msedge-tts` vào dependencies/devDependencies
    - Đọc tùy chọn từ env (`TTS_VOICE` mặc định `en-US-AriaNeural`, `TTS_RATE` mặc định 85, ép trong [80,90]); nếu provider về sau cần key thì đọc `TTS_API_KEY` từ env (không literal trong source)
    - _Requirements: 1.4, 1.5, 4.1, 4.3_

  - [x] 4.2 Cài đặt lõi `generateAudio(opts)` trong `scripts/audio/generate-audio.ts`
    - Nạp `questions.json` + `ENCOURAGEMENTS`, gọi `extractPronounceableTexts`, `normalizeText`, bỏ trùng → Map `normalized -> hash`
    - Nạp manifest cũ; lập kế hoạch tạo mới / tái dùng (hash khớp) / tạo lại & ghi đè (hash khác)
    - Gọi TTS client cho mục cần tạo (SSML rate ≈ -15%), ghi `.mp3` vào `outDir`; một mục lỗi → gom `failed`, KHÔNG ghi đè tệp cũ hợp lệ
    - Dọn tệp `.mp3` mồ côi; ghi `manifest.json` (`byText`, `byHash`) sau cùng
    - Thiết kế để inject `ttsClient` giả và lớp filesystem/thư mục tạm cho test; trả về `GenerateReport`
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 7.1, 7.2, 7.3, 7.4, 1.6, 1.7, 4.5_

  - [x] 4.3 Cổng kiểm tra cuối (fail-on-missing) + điểm vào CLI
    - Tính `missing` = văn bản chuẩn hóa thiếu tệp hợp lệ; nếu không rỗng → in danh sách đầy đủ và `process.exit(1)`
    - Số tệp `.mp3` phải bằng số văn bản duy nhất
    - Thêm điểm vào thực thi khi chạy trực tiếp (`tsx scripts/audio/generate-audio.ts`)
    - _Requirements: 2.8, 7.4, 7.5_

  - [x] 4.4 Viết property test cho generator (hoàn chỉnh & dedup)
    - **Property 1: Manifest completeness — mọi Pronounceable_Text resolvable**
    - **Validates: Requirements 1.1, 2.1, 2.3, 7.1**
    - **Property 3: Dedup theo chuẩn hóa — văn bản chuẩn hóa trùng → một tệp, nhiều khóa trỏ chung**
    - **Validates: Requirements 2.6, 7.1**
    - **Property 15: Manifest completeness cho câu động viên**
    - **Validates: Requirements 8.2, 8.5**
    - Dùng `ttsClient` giả + fs ảo, dataset `fast-check`; mỗi property ≥ 100 vòng, có comment nhãn

  - [x] 4.5 Viết property test cho generator (mồ côi, tái dùng, giữ tệp, cổng build)
    - **Property 4: Số tệp bằng số văn bản duy nhất (orphan removal)**
    - **Validates: Requirements 7.4, 2.1**
    - **Property 5: Tái dùng đúng theo hash (reuse iff hash khớp)**
    - **Validates: Requirements 7.2, 7.3**
    - **Property 6: Giữ nguyên tệp hợp lệ khi một mục lỗi**
    - **Validates: Requirements 1.7, 4.5**
    - **Property 7: Cổng build liệt kê đầy đủ văn bản thiếu**
    - **Validates: Requirements 2.8, 7.5**
    - Mỗi property ≥ 100 vòng, có comment nhãn

  - [ ]* 4.6 Viết unit test ví dụ cho generator
    - Ghi `.mp3` ra thư mục (R2.2); cấu trúc `manifest.json` (R2.3); voice mặc định `en-US`/`en-GB` (R1.4); rate trong [80,90] (R1.5); từ đơn truyền nguyên văn một lần (R1.6); message lỗi chứa văn bản khi dừng build (R2.8)
    - _Requirements: 2.2, 2.3, 1.4, 1.5, 1.6, 2.8_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Audio_Player (runtime)
  - [x] 6.1 Cài đặt `src/lib/audio.ts`
    - Định nghĩa `AudioManifest`, `AudioEnv` (`manifest`, `createAudio`, `speechEnv`, `now`), `PlayOutcome`
    - `stopCurrent(env)` dừng audio đang phát
    - `playText(env, rawText)`: `key = normalizeText(rawText)` → tra `manifest.byText[key]`; miss → fallback `speak`; hit → `stopCurrent`, tạo `HTMLAudioElement`, `play()`, timeout 3s → dừng + fallback; lỗi `onerror` → fallback; trả `PlayOutcome`
    - _Requirements: 2.4, 3.1, 3.2, 5.2, 6.3_

  - [x] 6.2 Thêm helper `playEncouragement(env, text)` non-blocking
    - `void playText(env, text).catch(() => {})`; không ném, không trả giá trị ảnh hưởng luồng câu hỏi
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 6.3 Viết property test cho Audio_Player (routing & fallback)
    - **Property 8: Chọn nguồn theo manifest (hit → tệp, miss → fallback)**
    - **Validates: Requirements 2.4, 3.1**
    - **Property 9: Suy biến khi phát thất bại hoặc quá 3s**
    - **Validates: Requirements 3.2, 5.2**
    - **Property 10: Speech_Fallback khả dụng iff có giọng "en"**
    - **Validates: Requirements 3.3**
    - **Property 14: Runtime chỉ dùng nguồn nội bộ (path khớp `^/audio/.*\.mp3$`)**
    - **Validates: Requirements 4.2**
    - Inject `createAudio` giả (ghi `src`, mô phỏng play/error/timeout qua `now()`) + `speechEnv` giả; mỗi property ≥ 100 vòng, có comment nhãn

  - [x] 6.4 Viết property test cho dừng audio và non-blocking encouragement
    - **Property 13: Dừng âm thanh đang phát trước khi phát mới**
    - **Validates: Requirements 6.3**
    - **Property 16: Phát câu động viên là không chặn (non-blocking)**
    - **Validates: Requirements 8.4**
    - Property 16: với mọi `PlayOutcome`/lỗi inject, `playEncouragement` không ném và ảnh chụp trạng thái câu hỏi trước/sau không đổi
    - Mỗi property ≥ 100 vòng, có comment nhãn

- [x] 7. AudioButton (UI)
  - [x] 7.1 Cập nhật `src/components/AudioButton.tsx`
    - Dùng `playText(audioEnv, text)` thay cho gọi trực tiếp `speak`; thêm trạng thái `playing`/`status` (`idle|playing|error|unavailable`)
    - Touch target 44×44 (`min-w-11 min-h-11`); kích hoạt Enter/Space (giữ `<button>` gốc, không chặn default)
    - Chỉ báo "đang phát" (đổi icon/kiểu + `aria-busy`); accessible name tiếng Việt (`aria-label="Nghe phát âm tiếng Anh"`)
    - Vùng `role="status"`: `unavailable` → disable nút + giữ thông báo "Không phát được giọng tiếng Anh trên thiết bị này.", gọi `onUnavailable`; `error` → báo lỗi nhưng giữ nút kích hoạt lại được
    - Tải audio khi tương tác, KHÔNG preload lúc mở trang
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 3.4, 5.5_

  - [x] 7.2 Viết unit test cho AudioButton
    - Enter/Space kích hoạt (R6.2); trạng thái playing + `aria-busy` (R6.4); accessible name VI (R6.5); `role="status"` + disable khi unavailable (R6.6); giữ enable khi error (R6.7); thông báo fallback cố định (R3.4); touch target 44×44 qua class (R6.1)
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 3.4_

  - [x] 7.3 Viết property test không preload
    - **Property 12: Không preload lúc mở trang**
    - **Validates: Requirements 5.5**
    - Render trang/`AudioButton` với số câu `n` bất kỳ (`fast-check`); đếm số lần `createAudio` trước tương tác = 0; ≥ 100 vòng, có comment nhãn

- [x] 8. Nối lời động viên vào luồng trả lời sai
  - [x] 8.1 Gọi `playEncouragement` trong `PlayClient.tsx`
    - Tại nhánh trả lời sai (nơi hiện gọi `pickEncouragement`/`setEncouragement`), lấy chuỗi tiếng Anh đang hiển thị và gọi `playEncouragement(audioEnv, encouragementText)` (không `await`, không đổi trạng thái câu hỏi theo kết quả)
    - Bảo đảm phiên học tiếp diễn bất kể `PlayOutcome`
    - _Requirements: 8.2, 8.3, 8.4_

  - [ ]* 8.2 Viết test luồng trả lời sai
    - **Property 11: Không lộ đáp án khi fallback câu nghe**
    - **Validates: Requirements 3.5**
    - Sinh `ListeningChoiceQuestion`; khẳng định text phát == `speechTextEn` và khác mọi `options[].textEn`; ≥ 100 vòng, có comment nhãn
    - Ví dụ bổ trợ: khi đánh dấu câu sai, UI gọi `playEncouragement` với đúng câu động viên hiển thị và phiên học tiếp diễn bất kể kết quả (R8.2, R8.4)

- [x] 9. Tích hợp build và cache
  - [x] 9.1 Thêm script build cho audio
    - Thêm `"audio:gen": "tsx scripts/audio/generate-audio.ts"` và `"prebuild": "npm run audio:gen"` vào `package.json`; giữ `"build": "next build"`
    - _Requirements: 2.5, 7.5_

  - [x] 9.2 Thêm khối cache `/audio/*` vào `public/_headers`
    - Thêm khối `/audio/*` với `Cache-Control: public, max-age=604800, immutable` (≥ 7 ngày)
    - _Requirements: 5.3_

  - [ ]* 9.3 Viết unit test cho `_headers`
    - Parse `public/_headers`; khối `/audio/*` có `max-age >= 604800`
    - _Requirements: 5.3_

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 11. Integration / e2e smoke (tùy chọn)
  - [ ]* 11.1 e2e Playwright thời gian bắt đầu phát
    - Đo thời gian bắt đầu phát với 1–2 ví dụ (R1.2, R5.1, R6.2)
    - _Requirements: 1.2, 5.1, 6.2_

  - [ ]* 11.2 Smoke sau build và cache lần phát thứ hai
    - Sau `npm run build`, `out/audio/` tồn tại với số tệp đúng (R2.5); lần phát thứ hai không tạo request mạng mới (R5.4)
    - _Requirements: 2.5, 5.4_

- [x] 12. Xác minh cuối cùng
  - Chạy `npm run lint`, `npm run typecheck`, `npm run test` (Vitest) và xác nhận mọi test (gồm property test ≥ 100 vòng) đều pass
  - Chạy `npm run build` và xác nhận `prebuild` sinh `public/audio/*.mp3` + `manifest.json`, và sau build `out/audio/` được populate
  - _Requirements: 2.5, 7.5_

## Notes

- Tasks gắn `*` là tùy chọn (e2e/Playwright, smoke cache, một số ví dụ bổ trợ) và có thể bỏ qua cho MVP. Property/unit test cho các module lõi thuần (audio-key, encouragements, extract, generator, audio player, AudioButton) là bắt buộc.
- Mỗi property test cấu hình tối thiểu 100 vòng (`fc.assert(..., { numRuns: 100 })`) và mở đầu bằng comment `// Feature: native-pronunciation, Property N: ...`.
- Generator và runtime dùng chung `normalizeText`/`hashText` từ `src/lib/audio-key.ts` để khóa tra cứu luôn khớp.
- Mọi nhánh lỗi runtime không thay đổi trạng thái câu hỏi; phát câu động viên là non-blocking.
- Checkpoint bảo đảm xác minh tăng dần trước khi sang tầng kế tiếp.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["1.3", "2.2", "3.1", "9.2"] },
    { "id": 2, "tasks": ["2.3", "3.2", "3.3", "4.1", "9.1", "9.3"] },
    { "id": 3, "tasks": ["4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "4.6"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 9, "tasks": ["8.2", "11.1", "11.2"] }
  ]
}
```
