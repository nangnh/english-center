# Thiết kế
## Kiến trúc
Next.js phục vụ shell và nội dung tĩnh; vùng chơi là client component. Engine thuần nhận Question + Answer và trả Evaluation. Storage adapter độc lập với React, bắt lỗi JSON/quota/security và có memory fallback. Không server actions, database hay endpoint ghi dữ liệu.

## Mô hình
Question là discriminated union: choice, picture-choice, matching, fill, listening-choice, spell-fill, unscramble. Common: id, topic, difficulty 1–3, promptVi, explanationVi. Choice có option IDs ổn định và correctOptionId; picture có asset SVG và alt; matching có pair IDs; fill có acceptedAnswers; listening có speechTextEn, option IDs và readingFallback (một đề đọc tương đương, không đơn thuần hiện lời đọc và đáp án). spell-fill có answerEn và mảng blankIndexes (vị trí chữ bị khuyết) cùng gợi ý promptVi/nghĩa; unscramble có answerEn mà engine suy ra các chữ cái xáo trộn ổn định. Hai dạng chữ cái là trò chơi chữ phổ thông tự sáng tác, không sao chép nhận diện IOE. Nội dung học tiếng Anh và hướng dẫn Việt tách riêng.
Round {id, titleVi, questionIds[20], stageSize:5, durationSeconds:1800, passScore:150}.
Attempt {id, mode, roundId?, questionIds, answersById, evaluationsById, currentIndex, startedAtMs, deadlineMs?, endedAtMs?, status, audioFallbackIds}. Progress {schemaVersion:1, unlockedRoundIds, bestByRound, attempts, activeAttemptId}. Chỉ giữ 50 lượt gần nhất; bestByRound không bị mất vì dọn lịch sử.

## Luồng và bất biến
Một reducer quản lý idle → playing → submitted-question → playing → finished; nộp lặp không cộng điểm. Đánh giá ngay sau submit rồi nút Tiếp theo. Matching chỉ đúng khi đủ cả 3 cặp. Fill normalize trim/toLowerCase, không strip ký tự tùy tiện. spell-fill chấm đúng khi các chữ điền vào đúng vị trí khuyết (không phân biệt hoa thường), ghép lại thành answerEn. unscramble chấm đúng khi chuỗi chữ cái trẻ ghép (theo thứ tự chọn) trùng answerEn; cho chọn/bỏ chọn bằng click hoặc bàn phím, chữ cái xáo trộn ổn định trong lượt (seed theo id). Shuffle option IDs giữ nguyên đáp án và giữ ổn định trong lượt, không shuffle lại mỗi render.
Timer hiển thị ceil(max(0, deadline-Date.now())/1000), tick mỗi giây và kiểm tra lại khi tab visible. Không tạm dừng thử thách; cảnh báo trước khi thoát. Reload lượt hết hạn → kết thúc một lần. Kết quả và best update atomically qua reducer rồi persist; reset active attempt sau khi lưu kết quả. Nếu nhiều tab, cảnh báo và không cho hai tab cùng chấm lượt đang hoạt động (storage event + khóa/owner token thích hợp); MVP không chống gian lận hoặc chỉnh đồng hồ.
Mở vòng N+1 khi điểm N ≥150; best ưu tiên điểm cao rồi thời gian ngắn. Không khóa lại vòng khi làm lại điểm thấp.

## UI
Phong cách khu vườn riêng, màu sáng có tương phản, thẻ lớn, thanh tiến độ, điểm và đồng hồ rõ. Không sao chép layout hay asset IOE. focus visible; feedback aria-live không ồn; reduced-motion; nối cặp bằng click hoặc keyboard. Thông báo storage/audio lỗi không chặn bài. TTS en-US/en-GB nếu có, rate khoảng 0.8; quản lý voiceschanged và hủy khi unmount.

## Kiểm thử
Unit: dữ liệu ≥160 câu/đủ 7 chủ đề/7 dạng, chấm 7 loại (gồm spell-fill và unscramble), normalize fill, matching sai một cặp, spell-fill điền sai/đủ, unscramble sai thứ tự, nộp trùng, ngưỡng 140/150/200, deadline reload/background, unlock, best retention, schema hỏng, storage chặn, giới hạn lịch sử, fallback audio.
E2E: mobile 360px + desktop; luyện nhanh; vòng hoàn chỉnh; fail/pass/retry; reload giữa vòng; hết giờ bằng clock giả; xem tiến bộ; xác nhận reset; keyboard matching; audio unavailable fallback. Không dựa vào TTS thực trong CI: mock speech synthesis. Manual check Safari/Chrome thật cho voice và touch, ghi rõ nếu chưa kiểm tra.
