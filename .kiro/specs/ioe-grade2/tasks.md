# Tasks — Kiro thực hiện lần lượt
Chưa có ứng dụng được tạo. Đây là bộ brief/spec bàn giao cho Kiro, không phải code đã hoàn thành.

- [x] 1. Đọc toàn bộ steering và spec; tóm tắt kế hoạch tiếng Việt, ghi giả định. Không thay đổi phạm vi hoặc dùng dịch vụ trả phí. Chỉ hỏi nếu thật sự bị chặn.
- [x] 2. Scaffold Next.js + TypeScript + Tailwind an toàn trong folder này, giữ nguyên .kiro/README; thiết lập scripts, lint/typecheck/Vitest/Playwright và lockfile. Kiểm tra Node hiện có có tương thích, báo trước nếu cần nâng cấp hệ thống.
- [x] 3. Tạo type unions, schema validation, 160 câu nguyên bản, 8 vòng và SVG tự vẽ; bảo đảm đủ ma trận chủ đề/dạng và đáp án/giải thích đã soát. Viết test dữ liệu (R2).
- [x] 4. Implement engine, reducer, chấm điểm, 4 chặng, timer deadline và kết thúc idempotent; test chấm 5 dạng, nộp trùng, hết giờ và mốc pass (R3).
- [x] 5. Implement storage versioned, resume, best/unlock, lịch sử bounded, memory fallback, xử lý đa tab; viết test lỗi và reload (R4).
- [x] 6. Xây design system và trang chủ/chủ đề/vòng; UI tiếng Việt riêng, responsive 360px+, điều hướng keyboard (R1).
- [x] 7. Xây trang chơi và 5 renderer, feedback, thanh tiến độ, exit warning; nối cặp có click/keyboard, fill thân thiện trẻ (R1–R3).
- [x] 8. Implement speechSynthesis với voice detection, replay, cancel, fallback câu đọc tương đương; test mock unavailable/error (R5).
- [x] 9. Xây kết quả, luyện lại, tiến bộ, huy hiệu và bảng thành tích local; xác nhận xóa dữ liệu 2 bước; ghi chú không liên kết IOE (R4/R6).
- [x] 10. Viết/chạy e2e các luồng trong design, kiểm tra a11y cơ bản và mobile; chạy npm run lint, npm run typecheck, npm test, npm run build, npm run test:e2e. Sửa lỗi, ghi output thực và giới hạn chưa kiểm thử.
- [x] 11. Cập nhật README tiếng Việt (cài/chạy/test, dữ liệu local, audio, không backend), tổng kết file đã làm và cách demo. Chạy dev local nếu người dùng muốn; không deploy hay đăng gì ra ngoài.

- [x] 12. Mở rộng 2 dạng trò chơi chữ cái tự sáng tác: spell-fill (điền chữ còn thiếu) và unscramble (sắp xếp chữ cái). Cập nhật types/validation/scoring/generator, thêm 2 renderer, bảo đảm mỗi vòng vẫn 20 câu đủ 7 dạng, độ khó tăng nhẹ. Viết/chạy unit + e2e, cập nhật README. Nội dung/giao diện riêng, không mô phỏng IOE (R2/R3).

- [x] 13. Tăng tương tác: auto-phát từ khóa (trừ listening), hiệu ứng tung hoa + âm chúc mừng khi đúng, âm báo sai nhẹ + lời động viên khi sai (Web Audio nội bộ, không file ngoài), nút bật/tắt âm thanh lưu thiết bị, tôn trọng reduced-motion, auto-focus ô nhập fill/spell-fill. Viết/chạy unit + e2e, cập nhật README (R2/R5).

## Prompt khởi động
“Đọc .kiro/steering và .kiro/specs/ioe-grade2. Dùng /planning để kiểm tra kế hoạch nếu cần, rồi dùng /cook-web-app thực hiện lần lượt tasks.md, bắt đầu task 1. Tự xây MVP English Garden lớp 2 theo requirements và design, giữ nguyên nội dung gốc, không copy IOE. Sau mỗi task chạy test phù hợp và cập nhật checkbox. Không deploy, không dùng API trả phí hoặc credential.”
