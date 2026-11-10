# Requirements Document

## Introduction

Tính năng **native-pronunciation** nâng cao chất lượng phát âm tiếng Anh trong ứng dụng học tiếng Anh IOE lớp 2 (English Garden). Hiện tại ứng dụng dùng Web Speech API của trình duyệt (`window.speechSynthesis`, qua `src/lib/speech.ts`, `rate = 0.8`), cho giọng máy móc và "cứng", chất lượng không ổn định giữa các thiết bị.

Vì toàn bộ từ vựng và câu tiếng Anh của ứng dụng là một tập hữu hạn, cố định và được biết trước (lưu trong `src/data/questions.json`), và vì ứng dụng là bản xuất tĩnh (static export) triển khai lên Cloudflare Pages (không có máy chủ chạy lúc runtime theo mặc định), giải pháp ưu tiên là **tạo sẵn (pre-generate) tệp âm thanh chất lượng cao ở bước build** bằng một công cụ TTS neural miễn phí (ví dụ Microsoft Edge TTS), đóng gói các tệp `.mp3` tĩnh và cho trình duyệt phát trực tiếp lúc runtime.

Khi tệp tạo sẵn thiếu hoặc không tải được, ứng dụng phải suy biến mượt về Web Speech API hiện có để không mất khả năng nghe. Người dùng mục tiêu là học sinh lớp 2, nên âm thanh phải rõ ràng, tự nhiên, giọng bản ngữ, phù hợp trẻ em và tốc độ hơi chậm để dễ học.

Ứng dụng được định vị là **"English-native"**: mọi âm thanh mà ứng dụng phát ra đều là tiếng Anh giọng bản ngữ, và ứng dụng KHÔNG tạo hay phát bất kỳ âm thanh tiếng Việt nào (không có text-to-speech tiếng Việt). Văn bản tiếng Việt trên màn hình (câu lệnh hướng dẫn, nhãn giao diện) vẫn hiển thị để học sinh đọc, nhưng KHÔNG được đọc thành tiếng. Theo định vị này, các lời động viên khi trả lời sai — trước đây là tiếng Việt trong `src/lib/sound.ts` (`ENCOURAGEMENTS`, ví dụ "Không sao, cố lên nhé!") — sẽ được đổi thành các câu tiếng Anh ngắn, thân thiện với trẻ em (ví dụ "Keep going!", "Almost there, try again!", "Great effort!"), và các câu động viên tiếng Anh này trở thành một phần của tập Pronounceable_Text: được tạo sẵn thành âm thanh tiếng Anh bản ngữ ở bước build và phát thành tiếng.

> Lưu ý phạm vi: "AI MCP" là giao thức dùng cho agent/thời điểm phát triển, không phải năng lực runtime của trình duyệt. Vì vậy các yêu cầu dưới đây tập trung vào **chất lượng và phân phối TTS**, không dựa vào MCP lúc runtime. MCP (nếu có) chỉ là chi tiết triển khai của công cụ build, sẽ được bàn ở giai đoạn thiết kế.

## Glossary

- **Audio_System**: Toàn bộ năng lực phát âm tiếng Anh runtime của ứng dụng, gồm trình phát tệp tạo sẵn và cơ chế suy biến.
- **Audio_Player**: Thành phần runtime chịu trách nhiệm tải và phát một tệp âm thanh tiếng Anh tạo sẵn trong trình duyệt.
- **TTS_Generator**: Công cụ chạy ở bước build, chuyển văn bản tiếng Anh thành tệp âm thanh tạo sẵn.
- **Speech_Fallback**: Cơ chế hiện có dùng Web Speech API (`src/lib/speech.ts`) để đọc văn bản khi tệp tạo sẵn không khả dụng.
- **Pregenerated_Audio**: Tệp âm thanh tĩnh (định dạng `.mp3`) được tạo sẵn ở bước build cho một văn bản tiếng Anh xác định.
- **Audio_Manifest**: Bảng ánh xạ từ một văn bản tiếng Anh (đã chuẩn hóa) sang đường dẫn tệp Pregenerated_Audio tương ứng.
- **Pronounceable_Text**: Một chuỗi tiếng Anh bất kỳ mà ứng dụng có thể phát cho người học, gồm (a) các chuỗi trong bộ dữ liệu câu hỏi (ví dụ `questionEn`, `speechTextEn`, `textEn` của lựa chọn, `leftEn`, `answerEn`) và (b) các câu động viên tiếng Anh được hiển thị và phát khi người học trả lời sai (`Encouragement_Message`).
- **Encouragement_Message**: Một câu động viên tiếng Anh ngắn, phù hợp trẻ em, được hiển thị và phát thành tiếng khi người học trả lời sai (thay cho các câu động viên tiếng Việt cũ trong `src/lib/sound.ts`). Mỗi Encouragement_Message là một Pronounceable_Text.
- **Question_Dataset**: Bộ dữ liệu câu hỏi tại `src/data/questions.json` cùng các kiểu trong `src/types/index.ts`.
- **AudioButton**: Nút giao diện (`src/components/AudioButton.tsx`) để người học yêu cầu phát âm.
- **Learner**: Người dùng mục tiêu — học sinh lớp 2.
- **Build_Process**: Quy trình `npm run build` tạo bản xuất tĩnh trong thư mục `out/`.

## Requirements

### Requirement 1: Phát âm tiếng Anh chất lượng bản ngữ cho mọi văn bản trong ứng dụng

**User Story:** Là một học sinh lớp 2, tôi muốn nghe phát âm tiếng Anh rõ ràng và tự nhiên như giọng bản ngữ, để tôi học phát âm đúng.

#### Acceptance Criteria

1. THE Audio_System SHALL cung cấp phát âm giọng tiếng Anh bản ngữ cho 100% Pronounceable_Text duy nhất xuất hiện trong Question_Dataset.
2. WHEN một Learner yêu cầu phát âm một Pronounceable_Text có Pregenerated_Audio khả dụng, THE Audio_Player SHALL bắt đầu phát tệp Pregenerated_Audio tương ứng trong vòng 500 mili-giây.
3. IF một Pronounceable_Text không có Pregenerated_Audio và cũng không phát được qua Speech_Fallback, THEN THE Audio_System SHALL hiển thị chỉ báo lỗi cho người dùng và giữ nguyên trạng thái câu hỏi hiện tại (không làm gián đoạn phiên học).
4. THE TTS_Generator SHALL tạo Pregenerated_Audio bằng giọng tiếng Anh neural bản ngữ với mã ngôn ngữ `en-US` hoặc `en-GB`.
5. THE TTS_Generator SHALL tạo Pregenerated_Audio ở tốc độ đọc trong khoảng từ 80% đến 90% tốc độ mặc định của giọng đọc.
6. WHERE một Pronounceable_Text là một từ đơn, THE TTS_Generator SHALL tạo Pregenerated_Audio phát âm trọn vẹn từ đó đúng một lần.
7. IF TTS_Generator không tạo được Pregenerated_Audio cho một Pronounceable_Text, THEN THE TTS_Generator SHALL giữ nguyên các Pregenerated_Audio hợp lệ đã có trước đó (không ghi đè).

### Requirement 2: Tạo sẵn âm thanh ở bước build từ bộ dữ liệu hữu hạn

**User Story:** Là người bảo trì ứng dụng, tôi muốn âm thanh được tạo sẵn ở bước build và đóng gói thành tệp tĩnh, để ứng dụng giữ nguyên mô hình static export và tương thích Cloudflare Pages.

#### Acceptance Criteria

1. THE TTS_Generator SHALL đọc danh sách Pronounceable_Text từ Question_Dataset và tạo một Pregenerated_Audio cho mỗi Pronounceable_Text duy nhất sau khi chuẩn hóa.
2. THE TTS_Generator SHALL ghi mỗi Pregenerated_Audio thành tệp tĩnh định dạng `.mp3` vào thư mục tài nguyên tĩnh của ứng dụng.
3. THE TTS_Generator SHALL tạo Audio_Manifest ánh xạ mỗi Pronounceable_Text đã chuẩn hóa tới đường dẫn tệp Pregenerated_Audio tương ứng.
4. WHEN Audio_Player chuẩn bị phát một Pronounceable_Text, THE Audio_Player SHALL tra cứu Audio_Manifest để xác định đường dẫn Pregenerated_Audio tương ứng trước khi phát.
5. WHEN Build_Process hoàn tất, THE Audio_System SHALL phục vụ mọi Pregenerated_Audio dưới dạng tệp tĩnh mà không cần máy chủ runtime.
6. WHERE hai Pronounceable_Text khác nhau chuẩn hóa thành cùng một chuỗi, THE TTS_Generator SHALL tái dùng một Pregenerated_Audio duy nhất cho cả hai.
7. IF một Pronounceable_Text trong Audio_Manifest không có tệp Pregenerated_Audio tương ứng khi tra cứu, THEN THE Audio_Player SHALL bỏ qua việc phát và cung cấp chỉ báo lỗi cho người dùng biết âm thanh không khả dụng, đồng thời giữ nguyên trạng thái câu hỏi hiện tại.
8. IF TTS_Generator không tạo được Pregenerated_Audio cho một Pronounceable_Text trong Build_Process, THEN THE Build_Process SHALL dừng với chỉ báo lỗi xác định Pronounceable_Text bị lỗi.

### Requirement 3: Suy biến mượt về Web Speech API

**User Story:** Là một học sinh lớp 2, tôi muốn vẫn nghe được phát âm khi tệp âm thanh tạo sẵn bị thiếu hoặc không tải được, để việc học không bị gián đoạn.

#### Acceptance Criteria

1. IF một Pronounceable_Text không có mục trong Audio_Manifest, THEN THE Audio_System SHALL dùng Speech_Fallback để đọc văn bản đó.
2. IF việc tải hoặc phát một Pregenerated_Audio thất bại hoặc không hoàn tất trong vòng 3 giây, THEN THE Audio_System SHALL dừng Pregenerated_Audio và dùng Speech_Fallback để đọc văn bản tương ứng.
3. THE Audio_System SHALL coi Speech_Fallback là khả dụng khi và chỉ khi trình duyệt có ít nhất một giọng đọc với mã ngôn ngữ bắt đầu bằng "en".
4. IF cả Pregenerated_Audio và Speech_Fallback đều không khả dụng cho một Pronounceable_Text, THEN THE AudioButton SHALL hiển thị thông báo "Không phát được giọng tiếng Anh trên thiết bị này.", gọi hàm `onUnavailable` nếu được cung cấp, và giữ nguyên trạng thái câu hỏi hiện tại.
5. WHILE một dạng câu nghe (`listening-choice`) đang hiển thị, THE Audio_System SHALL chỉ đọc văn bản nguồn của âm thanh và SHALL KHÔNG đọc, hiển thị hoặc để lộ bất kỳ lựa chọn đáp án nào khi dùng Speech_Fallback.

### Requirement 4: Ràng buộc chi phí — chỉ dùng TTS miễn phí

**User Story:** Là người bảo trì ứng dụng, tôi muốn giải pháp phát âm không phát sinh chi phí dịch vụ, để dự án duy trì được lâu dài mà không tốn tiền.

#### Acceptance Criteria

1. THE TTS_Generator SHALL dùng một công cụ hoặc dịch vụ TTS có mức chi phí sử dụng bằng 0 (không tính phí theo số ký tự, số lượt gọi, hay thời lượng âm thanh) để tạo Pregenerated_Audio.
2. WHEN người dùng kích hoạt phát âm, THE Audio_System SHALL phát Pregenerated_Audio đã lưu sẵn trong ứng dụng mà KHÔNG thực hiện bất kỳ lời gọi mạng nào tới dịch vụ TTS bên ngoài tại thời điểm runtime.
3. WHERE công cụ TTS yêu cầu khóa truy cập (credential), THE TTS_Generator SHALL đọc khóa từ biến môi trường và SHALL KHÔNG lưu khóa vào mã nguồn quản lý phiên bản.
4. IF công cụ TTS yêu cầu khóa truy cập nhưng biến môi trường chứa khóa không tồn tại hoặc rỗng, THEN THE TTS_Generator SHALL dừng quá trình tạo Pregenerated_Audio và hiển thị thông báo lỗi cho biết thiếu khóa truy cập, đồng thời KHÔNG tạo ra tệp âm thanh không hợp lệ.
5. IF việc tạo Pregenerated_Audio cho một mục làm phát sinh phí sử dụng hoặc vượt hạn mức miễn phí của công cụ TTS, THEN THE TTS_Generator SHALL dừng tạo mục đó và ghi lại thông báo lỗi cho biết lý do vượt hạn mức, đồng thời giữ nguyên các tệp âm thanh đã tạo hợp lệ trước đó.

### Requirement 5: Hành vi tải lần đầu, bộ nhớ đệm và ngoại tuyến

**User Story:** Là một học sinh lớp 2 dùng kết nối mạng chậm, tôi muốn âm thanh phát nhanh sau lần đầu và không tải lại thừa, để trải nghiệm học mượt mà.

#### Acceptance Criteria

1. WHEN một Learner yêu cầu phát một Pregenerated_Audio lần đầu, THE Audio_Player SHALL tải tệp từ mạng rồi bắt đầu phát trong vòng 3 giây kể từ khi tệp tải xong.
2. IF việc tải một Pregenerated_Audio từ mạng thất bại hoặc không hoàn tất trong vòng 10 giây, THEN THE Audio_Player SHALL dừng việc tải, giữ nguyên trạng thái màn hình hiện tại và hiển thị chỉ báo lỗi cho biết âm thanh không phát được.
3. THE Audio_System SHALL cấu hình tiêu đề HTTP cache cho các tệp Pregenerated_Audio tĩnh với thời gian lưu đệm tối thiểu 7 ngày (604800 giây) để trình duyệt lưu đệm giữa các lần truy cập.
4. IF một Pregenerated_Audio đã có trong bộ nhớ đệm của trình duyệt, THEN THE Audio_Player SHALL phát từ bộ nhớ đệm mà không tải lại từ mạng.
5. THE Audio_System SHALL KHÔNG tải trước (preload) tất cả Pregenerated_Audio cùng lúc khi mở trang; tại thời điểm mở trang số lượng tệp Pregenerated_Audio được tải trước SHALL là 0.

### Requirement 6: Trải nghiệm nút âm thanh thân thiện trẻ em và tiếp cận được

**User Story:** Là một học sinh lớp 2, tôi muốn nút nghe dễ hiểu, dễ bấm và báo rõ trạng thái, để tôi tự dùng được mà không cần người lớn.

#### Acceptance Criteria

1. THE AudioButton SHALL hiển thị nhãn tiếng Việt kèm biểu tượng loa (ví dụ "🔊 Nghe") với vùng kích hoạt (touch target) tối thiểu 44×44 pixel CSS.
2. WHEN một Learner kích hoạt AudioButton bằng chuột, chạm, hoặc phím Enter hoặc phím Space, THE Audio_System SHALL bắt đầu phát âm trong vòng 300 mili-giây kể từ thời điểm kích hoạt.
3. WHEN một Learner kích hoạt AudioButton trong khi một âm thanh khác đang phát, THE Audio_Player SHALL dừng âm thanh đang phát trước khi bắt đầu phát âm thanh mới.
4. WHILE AudioButton đang phát âm thanh, THE AudioButton SHALL hiển thị chỉ báo trạng thái "đang phát" có thể quan sát được bằng mắt (thay đổi biểu tượng hoặc kiểu hiển thị của nút).
5. THE AudioButton SHALL cung cấp nhãn truy cập (accessible name) bằng tiếng Việt mô tả chức năng của nút để trình đọc màn hình đọc được.
6. WHILE trạng thái phát âm không khả dụng, THE AudioButton SHALL truyền đạt trạng thái không khả dụng qua một vùng `role="status"` và vô hiệu hóa khả năng kích hoạt của nút.
7. IF việc phát âm thất bại sau khi được kích hoạt, THEN THE Audio_System SHALL truyền đạt thông báo lỗi cho biết không phát được âm thanh qua vùng `role="status"` và giữ nguyên AudioButton ở trạng thái có thể kích hoạt lại.

### Requirement 7: Đồng bộ âm thanh với bộ dữ liệu câu hỏi

**User Story:** Là người bảo trì ứng dụng, tôi muốn âm thanh luôn khớp với bộ dữ liệu hiện tại, để không có từ nào thiếu tiếng hay còn tiếng thừa của dữ liệu cũ.

#### Acceptance Criteria

1. WHEN Build_Process chạy, THE TTS_Generator SHALL bảo đảm tồn tại đúng một Pregenerated_Audio cho mỗi Pronounceable_Text duy nhất trong Question_Dataset hiện tại, với Pronounceable_Text duy nhất được xác định bằng cách so khớp chính xác chuỗi văn bản nguồn đã chuẩn hóa (loại bỏ khoảng trắng đầu/cuối, chuẩn hóa khoảng trắng liên tiếp thành một khoảng trắng).
2. WHERE một Pregenerated_Audio đã tồn tại và giá trị băm (hash) của văn bản nguồn đã chuẩn hóa khớp với giá trị băm được lưu cho tệp đó, THE TTS_Generator SHALL tái dùng tệp đã có thay vì tạo lại.
3. IF một Pregenerated_Audio đã tồn tại nhưng giá trị băm của văn bản nguồn đã chuẩn hóa không khớp với giá trị băm được lưu, THEN THE TTS_Generator SHALL tạo lại tệp và ghi đè Pregenerated_Audio cũ.
4. WHEN một Pronounceable_Text không còn tồn tại trong Question_Dataset, THE TTS_Generator SHALL loại mọi Pregenerated_Audio mồ côi tương ứng khỏi kết quả build sao cho sau khi build hoàn tất, số lượng Pregenerated_Audio bằng đúng số lượng Pronounceable_Text duy nhất trong Question_Dataset hiện tại.
5. IF sau khi TTS_Generator chạy xong còn ít nhất một Pronounceable_Text trong Question_Dataset thiếu Pregenerated_Audio tương ứng, THEN THE TTS_Generator SHALL dừng Build_Process với trạng thái thất bại và xuất thông báo lỗi liệt kê đầy đủ từng văn bản nguồn còn thiếu, đồng thời không tạo ra kết quả build một phần.

### Requirement 8: Lời động viên tiếng Anh bản ngữ và không có TTS tiếng Việt

**User Story:** Là một học sinh lớp 2, tôi muốn khi trả lời sai được nghe một lời động viên tiếng Anh ngắn gọn, ấm áp bằng giọng bản ngữ, để tôi vừa được khích lệ vừa luyện nghe tiếng Anh.

#### Acceptance Criteria

1. THE Audio_System SHALL trình bày mọi Encouragement_Message bằng tiếng Anh, dưới dạng câu ngắn phù hợp với học sinh lớp 2 (ví dụ "Keep going!", "Almost there, try again!", "Great effort!").
2. WHEN một Learner trả lời sai, THE Audio_System SHALL phát Pregenerated_Audio tiếng Anh bản ngữ tương ứng với Encouragement_Message đang được hiển thị.
3. IF Pregenerated_Audio của Encouragement_Message đang hiển thị không khả dụng, THEN THE Audio_System SHALL dùng Speech_Fallback để đọc Encouragement_Message đó (theo Requirement 3).
4. WHEN phát âm cho một Encouragement_Message, THE Audio_System SHALL giữ hành vi không chặn (non-blocking) sao cho việc phát hoặc thất bại khi phát không làm gián đoạn phiên học và giữ nguyên trạng thái câu hỏi hiện tại.
5. THE TTS_Generator SHALL đưa văn bản tiếng Anh của mọi Encouragement_Message vào tập tạo sẵn ở Build_Process, sao cho mỗi Encouragement_Message có đúng một Pregenerated_Audio tương ứng.
6. THE Audio_System SHALL KHÔNG tạo hoặc phát bất kỳ âm thanh text-to-speech tiếng Việt nào ở bất kỳ vị trí nào trong ứng dụng.
