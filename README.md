# English Garden — Luyện tiếng Anh lớp 2

Website luyện tiếng Anh cho học sinh lớp 2 (7–8 tuổi), lấy cảm hứng từ mô hình
vòng tự luyện của ioe.vn nhưng **nội dung, hình ảnh và nhận diện hoàn toàn tự
sáng tác**. Đây là sản phẩm luyện tập độc lập, **không liên kết, không phải bản
sao và không được tài trợ bởi IOE**. Toàn bộ dữ liệu chỉ lưu trên thiết bị.

MVP đã được Kiro xây hoàn chỉnh và kiểm thử. Hướng dẫn bên dưới là cách chạy
thật.

## Yêu cầu hệ thống
- Node.js ≥ 18.18 (đã kiểm thử trên Node v20.18.1, npm 10).
- Trình duyệt hiện đại. Tính năng nghe (TTS) cần giọng tiếng Anh cài sẵn trong
  hệ điều hành/trình duyệt.

## Cài đặt và chạy
```bash
npm install
npm run dev
```
Mở địa chỉ localhost hiển thị trong terminal (mặc định http://localhost:3000).

Chạy bản production cục bộ:
```bash
npm run build
npm run start
```

## Kiểm thử
```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript strict (tsc --noEmit)
npm test            # Unit + component (Vitest + Testing Library)
npm run build       # Build production
npm run test:e2e    # End-to-end (Playwright)
```

Lần chạy gần nhất (cục bộ, macOS, Node v20.18.1):
- lint: không lỗi/cảnh báo.
- typecheck: không lỗi.
- unit: **83/83** test qua (11 file).
- build: compiled successfully, 7 route.
- e2e: **28/28** test qua trên desktop (Chromium) và mobile 360px (Pixel 5).

Lần đầu chạy e2e cần cài trình duyệt Playwright:
```bash
npx playwright install chromium
```

### Bằng chứng video e2e
`npm run test:e2e` được cấu hình `video: "on"`, mỗi test sinh một file `.webm`
trong thư mục `test-results/` (giữ nguyên định dạng webm). Muốn tắt quay video,
đổi `video` trong `playwright.config.ts`.

## Phạm vi và cách chơi
- Trang chủ → Luyện nhanh / Vòng luyện / Tiến bộ.
- **Luyện nhanh**: chọn 1 trong 7 chủ đề, làm 5 câu, không giới hạn giờ, không
  ảnh hưởng việc mở khóa vòng.
- **Vòng luyện**: 8 vòng × 20 câu (4 chặng × 5), mỗi vòng 30 phút. Đạt ≥150/200
  để mở vòng tiếp theo. Vòng 1 mở sẵn.
- **5 dạng câu**: chọn đáp án, chọn tranh, nối cặp (3 cặp/câu), điền từ, nghe
  chọn đáp án. Nối cặp dùng click hoặc bàn phím, không bắt buộc kéo thả.
- **Tiến bộ**: điểm tốt nhất mỗi vòng, huy hiệu và bảng thành tích — tất cả
  "Trên thiết bị này". Có nút xóa dữ liệu xác nhận hai bước cho phụ huynh.

Cấu trúc MVP (8 vòng, 30 phút, mốc 150 điểm…) là **quyết định thiết kế riêng**,
không phải cấu trúc hay quy chế thi IOE chính thức. Nội dung phù hợp lứa tuổi
nên được phụ huynh/giáo viên duyệt trước khi dùng rộng rãi.

## Lưu trữ, âm thanh và quyền riêng tư
- **Không backend, không tài khoản, không tracker, không thanh toán, không API
  trả phí.** Không gửi dữ liệu ra ngoài thiết bị.
- Tiến bộ lưu trong `localStorage` theo schema versioned. Dữ liệu **không đồng
  bộ** giữa máy/trình duyệt và sẽ mất nếu xóa dữ liệu trình duyệt.
- Nếu `localStorage` bị chặn/hỏng/khác phiên bản, ứng dụng không crash mà chuyển
  sang chế độ bộ nhớ tạm và báo rõ.
- Thời gian vòng tính theo mốc deadline tuyệt đối: reload hay chuyển tab không
  đặt lại 30 phút.
- Nghe qua Web Speech API (`speechSynthesis`), tốc độ chậm (~0.8), chỉ phát sau
  thao tác người dùng. **TTS phụ thuộc giọng cài sẵn của trình duyệt, không đảm
  bảo offline hay trên mọi trình duyệt.** Khi không có giọng tiếng Anh, câu nghe
  cho dùng **bài đọc thay thế** cùng độ khó/điểm (ghi rõ đây không phải bài
  nghe), không phạt trẻ.
- Không có bảng xếp hạng công khai hay cơ chế chống gian lận/chỉnh đồng hồ.

## Cấu trúc mã nguồn
```
src/
  app/            Next.js App Router: /, /topics, /rounds,
                  /play/[roundId], /results/[attemptId], /progress
  components/     UI trẻ em, QuestionRenderer + 5 renderer theo dạng,
                  AudioButton, Timer, ProgressBar, PlayClient, ResultsClient,
                  hook useProgress
  lib/            Logic thuần tách UI: validation, engine (reducer/chấm điểm),
                  scoring, storage (versioned + fallback), tabs (khóa đa tab),
                  speech, session, shuffle, badges
  data/           questions.json (181 câu), rounds.json (8 vòng), loader
  types/          Discriminated unions: Question, Round, Attempt, Progress
public/illustrations/   23 tranh SVG tự vẽ, có mô tả truy cập (alt)
scripts/content/        Bộ sinh dữ liệu gốc + nội dung nguồn (source.ts)
tests/unit/     11 file unit/component (Vitest + Testing Library)
tests/e2e/      Playwright: smoke, quick, round, timeout, progress,
                audio fallback, matching bằng bàn phím
```

Tái sinh dữ liệu câu hỏi (sau khi sửa `scripts/content/source.ts`):
```bash
npx tsx scripts/content/generate.ts
```
Bộ sinh tự kiểm tra ≥160 câu, mỗi chủ đề ≥15, mỗi dạng ≥15, 8 vòng ×20 đủ 5 dạng
và báo lỗi nếu thiếu.

## Cách demo nhanh
1. `npm install && npm run dev`, mở localhost.
2. Trang chủ → **Luyện nhanh** → chọn một chủ đề → làm 5 câu → xem kết quả.
3. Trang chủ → **Vòng luyện** → Vòng 1 → làm vài câu, thử nút Nghe (nếu máy có
   giọng tiếng Anh) hoặc chọn "Dùng bài đọc thay thế".
4. Hoàn thành vòng để xem điểm; đạt ≥150 sẽ mở Vòng 2.
5. Trang chủ → **Tiến bộ** để xem huy hiệu, bảng thành tích và nút xóa dữ liệu
   hai bước.

## Giới hạn đã biết (chưa kiểm thử)
- Chưa chạy thủ công trên Safari/Chrome thật để xác nhận giọng TTS và thao tác
  chạm vật lý; e2e dùng speechSynthesis giả lập, không dùng TTS thật.
- Kiểm tra khả năng tiếp cận ở mức cơ bản (vai trò/aria, focus, vùng chạm, tương
  phản, điều hướng bàn phím). Chưa kiểm thử đầy đủ với trình đọc màn hình thực;
  tuân thủ WCAG đầy đủ cần kiểm thử thủ công với công nghệ hỗ trợ và chuyên gia.

## Nguồn tham khảo và mức độ xác minh
Xem `.kiro/steering/product.md`. Các thông số MVP là thiết kế riêng, không phải
quy định IOE chính thức.
