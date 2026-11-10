---
inclusion: always
---
# Chuẩn chất lượng nội dung dạy học (lớp 2)

Đây là website dạy tiếng Anh cho trẻ 7–8 tuổi (lớp 2). Nội dung sai sẽ dạy sai cho trẻ, nên mọi câu hỏi, đáp án, giải thích và văn bản hiển thị phải đúng, chuẩn và phù hợp lứa tuổi. Các quy tắc dưới đây áp dụng cho mọi thay đổi chạm tới nội dung học.

## Nguyên tắc tối thượng: KHÔNG tự ý thay đổi nội dung
- KHÔNG tự chế ra từ vựng, câu, đáp án, hay chủ đề mới "cho phong phú". AI không được tự quyết định nội dung dạy học.
- Chỉ thêm/sửa nội dung khi: (a) người dùng yêu cầu rõ ràng, hoặc (b) phát hiện lỗi sai thực sự (chính tả, ngữ pháp, đáp án sai, lệch lứa tuổi).
- Khi phát hiện nội dung đáng ngờ, KHÔNG tự sửa im lặng. Báo cáo cho người dùng: nêu rõ `id` câu hỏi, chỗ sai, lý do, và đề xuất sửa. Chờ xác nhận trước khi đổi nội dung mang tính sư phạm (từ vựng đích, đáp án đúng, nghĩa tiếng Việt).
- Lỗi rõ ràng và an toàn (sai chính tả hiển nhiên, thiếu dấu câu, ký tự lỗi) có thể sửa trực tiếp, nhưng phải liệt kê lại tất cả chỗ đã sửa trong phần tóm tắt.
- Bám sát nguồn tham khảo trong `.kiro/reference/` (danh sách bài, phonics, từ vựng theo SGK Global Success) và phạm vi chủ đề đã chốt trong `.kiro/steering/product.md`. Không mở rộng ra ngoài phạm vi này nếu không được yêu cầu.

## Chuẩn tiếng Anh
- Ưu tiên tiếng Anh-Mỹ (American English) vì trẻ đang theo chương trình Anh-Mỹ. Giữ nhất quán một biến thể trong toàn bộ nội dung dạy học.
  - Chính tả Mỹ: color (không colour), gray (không grey), center (không centre), -ize (organize, không -ise).
  - Từ vựng Mỹ khi có khác biệt: eraser (không rubber), pants (không trousers), soccer (không football cho môn bóng đá), cookie, candy, elevator, apartment, fall (mùa thu), mom.
  - Phát âm/giọng đọc cũng theo giọng Mỹ (xem spec native-pronunciation nếu liên quan).
  - Lưu ý: định danh trong code (topic key, round id...) nên dùng chính tả Mỹ cho nhất quán (vd topic "colors"). Tên file asset hiện có như colour-*.svg giữ nguyên để tránh phá liên kết, trừ khi người dùng yêu cầu đổi.
- Ngữ pháp, mạo từ (a/an), số ít/số nhiều, viết hoa đầu câu và tên riêng phải đúng.
- Từ vựng phải nằm trong tầm lớp 2: cụ thể, quen thuộc, đơn âm hoặc hai âm tiết đơn giản. Tránh từ trừu tượng, học thuật, hoặc hiếm gặp.
- Câu hỏi và các phương án nhiễu (distractor) phải cùng loại từ / cùng nhóm nghĩa để bài hợp lý (vd đáp án con vật thì nhiễu cũng là con vật).
- Chỉ đúng một đáp án đúng cho mỗi câu chọn; các phương án nhiễu không được vô tình cũng đúng.

## Chuẩn tiếng Việt
- Hướng dẫn (`promptVi`) và giải thích (`explanationVi`) viết tiếng Việt đúng chính tả, có dấu đầy đủ, dùng dấu câu và dấu ngoặc kép tiếng Việt (“ ”) nhất quán với dữ liệu hiện có.
- Câu văn ngắn, rõ, thân thiện với trẻ 7–8 tuổi; tránh từ Hán-Việt khó hoặc thuật ngữ.
- Nghĩa tiếng Việt phải khớp đúng từ tiếng Anh đích và đúng ngữ cảnh (vd "duck" = "con vịt", không phải "cúi xuống").

## Phù hợp lứa tuổi và an toàn
- Nội dung trong sáng, tích cực, không bạo lực, không gây sợ hãi, không định kiến.
- Độ khó `difficulty` 1–3 phải tương xứng với độ quen thuộc của từ.
- Tuân thủ nguyên tắc sản phẩm trong `product.md`: tự sáng tác, không sao chép đề/logo/thương hiệu IOE, không thu thập dữ liệu trẻ em.

## Khi nào phải chạy review
Trước khi coi là hoàn tất bất kỳ thay đổi nào tới `src/data/questions.json`, `src/data/rounds.json`, hoặc văn bản học hiển thị, hãy chạy quy trình review nội dung (skill `content-review`) và báo cáo kết quả. Không khẳng định "nội dung đã đúng" nếu chưa kiểm được từng tiêu chí.
