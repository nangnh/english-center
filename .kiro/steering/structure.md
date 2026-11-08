---
inclusion: always
---
# Cấu trúc dự kiến
- src/app/: trang chủ /, chủ đề /topics, vòng /rounds, bài /play/[roundId], kết quả /results/[attemptId], tiến bộ /progress.
- src/components/: UI trẻ em, QuestionRenderer và 5 renderer theo loại, AudioButton, Timer, ProgressBar.
- src/data/questions.json và rounds.json: nội dung gốc; không import code chứa secrets.
- src/lib/: schema/validation, engine, scoring, storage, speech; logic thuần tách UI.
- src/types/: discriminated unions Question, Round, Attempt, Progress.
- public/illustrations/: SVG tự vẽ có mô tả truy cập.
- tests/unit/, tests/e2e/: kiểm thử logic và hành trình.
- .kiro/specs/ioe-grade2/: requirements.md → design.md → tasks.md là nguồn kế hoạch.
- README.md: hướng dẫn tiếng Việt, chạy local, test, giới hạn audio/lưu trữ và quyền riêng tư.
Không khởi tạo project bằng lệnh ghi đè thư mục hiện tại. Giữ lại README và toàn bộ .kiro; nếu scaffolder yêu cầu thư mục trống, dùng thư mục tạm rồi chuyển các file mới không xung đột.
