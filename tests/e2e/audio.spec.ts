import { test, expect } from "@playwright/test";
import { mockSpeech, answerCurrent } from "./helpers";

test("không có giọng tiếng Anh: câu nghe cho dùng bài đọc thay thế", async ({
  page,
}) => {
  await mockSpeech(page, false); // không có giọng en
  await page.goto("/play/round-1");

  // Duyệt qua các câu cho tới khi gặp câu nghe (có nút/đoạn liên quan nghe).
  let foundListening = false;
  for (let i = 0; i < 20; i += 1) {
    const fallbackLink = page.getByRole("button", {
      name: /bài đọc thay thế/,
    });
    const unavailableMsg = page.getByText(
      /Không phát được giọng tiếng Anh/
    );
    if (
      (await fallbackLink.isVisible().catch(() => false)) ||
      (await unavailableMsg.isVisible().catch(() => false))
    ) {
      foundListening = true;
      // Dùng bài đọc thay thế và kiểm tra ghi chú.
      if (await fallbackLink.isVisible().catch(() => false)) {
        await fallbackLink.click();
        await expect(
          page.getByText(/không phải bài nghe/)
        ).toBeVisible();
      }
      break;
    }
    // Chưa phải câu nghe: trả lời và sang câu tiếp.
    await answerCurrent(page);
    const next = page.getByRole("button", { name: /Tiếp theo|Xem kết quả/ });
    await next.click();
  }

  expect(foundListening).toBe(true);
});
