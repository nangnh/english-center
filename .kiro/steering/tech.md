---
inclusion: always
---
# Công nghệ
- Next.js App Router + TypeScript strict + Tailwind CSS, React; chọn các phiên bản stable tương thích tại lúc khởi tạo. Ghi chính xác phiên bản vào lockfile.
- Không backend: ngân hàng câu hỏi JSON cục bộ, localStorage versioned cho tiến bộ/lượt đang làm. Truy cập browser API chỉ trong client component sau mount; tránh hydration mismatch.
- Web Speech API speechSynthesis tiếng Anh, tốc độ chậm; phát sau thao tác người dùng. Phát hiện thiếu API/voice/lỗi; báo rõ và cho chuyển sang câu đọc tương đương, không phạt trẻ. Không hứa audio hoạt động offline hoặc trên mọi trình duyệt.
- SVG nguyên bản trong public, không hotlink. Không cài gói/CLI Higgsfield hoặc Remotion vì MVP không cần video.
- Vitest + Testing Library cho logic/UI; Playwright cho hành trình chính. npm scripts: dev, build, start, lint, typecheck, test, test:e2e.
- Chỉ chạy local localhost. Không đọc credential, không triển khai, không kết nối dịch vụ ngoài; hỏi trước nếu cần đổi phạm vi.
- Sau mỗi nhóm task: test phù hợp, cập nhật checkbox và báo ngắn tiếng Việt. Không đánh dấu xong khi chưa có bằng chứng kiểm thử.
