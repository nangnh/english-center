import { test, expect } from "@playwright/test";
import { mockSpeech } from "./helpers";

test("nối cặp bằng bàn phím trong vòng luyện", async ({ page }) => {
  await mockSpeech(page, true);
  // Vòng 1 chắc chắn có câu nối; duyệt tới khi gặp (hai danh sách cột).
  await page.goto("/play/round-1");

  let foundMatching = false;
  for (let i = 0; i < 20; i += 1) {
    const leftList = page.getByRole("list", { name: "Từ tiếng Anh" });
    if (await leftList.isVisible().catch(() => false)) {
      foundMatching = true;
      const lefts = leftList.getByRole("button");
      const rights = page
        .getByRole("list", { name: "Nghĩa tiếng Việt" })
        .getByRole("button");
      const n = await lefts.count();
      for (let k = 0; k < n; k += 1) {
        // Dùng bàn phím: focus nút trái và nhấn Enter, rồi nút phải.
        await lefts.nth(k).focus();
        await page.keyboard.press("Enter");
        await rights.nth(k).focus();
        await page.keyboard.press("Enter");
      }
      await page.getByRole("button", { name: "Kiểm tra" }).click();
      // Sau khi nộp có phản hồi nối đúng/sai.
      await expect(
        page.getByText(/Nối đúng cả 3 cặp|Chưa đủ 3 cặp/)
      ).toBeVisible();
      break;
    }
    // Không phải matching: chọn lựa chọn đầu rồi tiếp.
    const fillInput = page.getByLabel(/Ô nhập từ tiếng Anh/);
    if (await fillInput.isVisible().catch(() => false)) {
      await fillInput.fill("x");
    } else {
      await page
        .locator('ul[role="list"] button:not([disabled])')
        .first()
        .click();
    }
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByRole("button", { name: /Tiếp theo|Xem kết quả/ }).click();
  }

  expect(foundMatching).toBe(true);
});
