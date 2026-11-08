# Yêu cầu — English Garden (MVP)
Các câu SHALL dưới đây là tiêu chí nghiệm thu EARS; đọc cùng steering/product.md.

## R1 — Điều hướng và giao diện
WHEN trẻ mở ứng dụng, hệ thống SHALL hiển thị trang chủ tiếng Việt với Luyện nhanh, Vòng luyện và Tiến bộ.
WHILE dùng màn hình từ 360px đến desktop, hệ thống SHALL không tràn ngang, có vùng chạm ≥44px, cỡ chữ thân bài ≥18px, tương phản WCAG AA và thao tác bàn phím đầy đủ.
WHEN trẻ dùng nối cặp, hệ thống SHALL cho chọn hai lần bằng chuột/chạm/bàn phím; không bắt buộc kéo thả.

## R2 — Nội dung
Hệ thống SHALL cung cấp ít nhất 160 câu tự sáng tác, phủ đủ 7 chủ đề và 7 dạng; mỗi chủ đề ≥15 câu và mỗi dạng ≥15 câu.
WHEN trẻ làm dạng điền chữ cái còn thiếu (spell-fill), hệ thống SHALL hiển thị từ bị khuyết một hoặc nhiều chữ cái và chấm đúng khi trẻ điền đúng các chữ còn thiếu, so khớp không phân biệt hoa thường; đây là nội dung tự sáng tác, không mô phỏng nhận diện IOE.
WHEN trẻ làm dạng sắp xếp chữ cái (unscramble), hệ thống SHALL hiển thị các chữ cái bị xáo trộn của một từ ngắn và cho trẻ chọn/bỏ chọn từng chữ bằng chuột/chạm/bàn phím để ghép lại; chấm đúng chỉ khi chuỗi ghép trùng từ gốc; không bắt buộc kéo thả.
WHEN tải ngân hàng, hệ thống SHALL kiểm tra ID duy nhất, đáp án hợp lệ, đủ dữ liệu tranh/audio, không thiếu tham chiếu vòng và không lặp ID trong một vòng.
Hệ thống SHALL có đúng 8 vòng ×20 câu, 4 chặng ×5 câu; mỗi vòng có đủ 7 dạng, tăng nhẹ độ khó. Một câu nối gồm 3 cặp và tính là một câu.
WHEN trẻ trả lời, hệ thống SHALL phản hồi nhẹ nhàng và giải thích tiếng Việt ngắn, không dùng thông điệp làm trẻ xấu hổ.

## R3 — Vòng và điểm
WHEN bắt đầu vòng, hệ thống SHALL khởi tạo 30 phút, 20 câu và 0 điểm.
WHEN nộp một câu lần đầu, hệ thống SHALL khóa đáp án, cho 10 điểm nếu hoàn toàn đúng, 0 nếu sai; không trừ điểm, không thưởng tốc độ, tối đa 200.
WHEN điền từ, hệ thống SHALL trim và so khớp không phân biệt hoa thường với tập đáp án cho phép, không chấp nhận từ sai chính tả.
WHEN hết giờ hoặc hoàn tất, hệ thống SHALL kết thúc đúng một lần, câu chưa trả lời tính 0 và hiển thị điểm, thời gian, câu đúng/sai cùng giải thích.
WHEN đạt ≥150/200, hệ thống SHALL mở vòng kế; vòng 1 mở mặc định, được làm lại mọi vòng đã mở và không mất thành tích tốt nhất.
WHEN bắt đầu luyện nhanh, hệ thống SHALL chọn 5 câu của chủ đề đã chọn, không giới hạn giờ, không ảnh hưởng mở khóa vòng.

## R4 — Lưu trữ
WHEN nộp câu hoặc đổi trạng thái, hệ thống SHALL lưu lượt hiện tại và tiến bộ vào localStorage schema versioned.
WHEN reload hoặc chuyển tab, hệ thống SHALL tính thời gian còn lại từ deadline tuyệt đối, không đặt lại 30 phút.
IF dữ liệu hỏng, phiên bản không hỗ trợ hoặc storage bị chặn, hệ thống SHALL không crash và thông báo chế độ bộ nhớ tạm/phục hồi an toàn.
WHEN xem bảng thành tích, hệ thống SHALL ghi rõ “Trên thiết bị này”; không yêu cầu tên thật, email, trường học.
WHEN phụ huynh xác nhận xóa dữ liệu trong hai bước, hệ thống SHALL xóa dữ liệu riêng ứng dụng và về trạng thái ban đầu.

## R5 — Nghe và khả năng tiếp cận
WHEN trẻ bấm Nghe, hệ thống SHALL đọc nội dung tiếng Anh, hủy phát trước đó và cho nghe lại, không autoplay.
IF không phát được giọng tiếng Anh, hệ thống SHALL thông báo và cho dùng câu đọc thay thế được soạn sẵn cùng độ khó/điểm, ghi rõ đây không phải bài nghe.
WHILE chưa chọn chế độ thay thế, hệ thống SHALL không hiển thị transcript là đáp án nghe trên màn hình; screen reader và đáp án sau bài được thiết kế không tiết lộ sớm đáp án.

## R6 — An toàn và chất lượng
Hệ thống SHALL không có đăng nhập, backend, tracker, thanh toán, gọi API AI hoặc liên kết đăng bài.
Hệ thống SHALL dùng nội dung/nhận diện riêng và có ghi chú không liên kết IOE.
WHEN bàn giao, hệ thống SHALL vượt build, lint, typecheck, unit tests và e2e; ghi rõ lỗi còn lại và không tuyên bố test đã chạy nếu chưa chạy.
