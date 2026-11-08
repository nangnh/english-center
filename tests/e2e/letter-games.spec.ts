import { test, expect } from "@playwright/test";
import { mockSpeech, answerCurrent } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSpeech(page, true);
});

test("vòng có dạng điền chữ còn thiếu (spell-fill)", async ({ page }) => {
  await page.goto("/play/round-1");
  let found = false;
  for (let i = 0; i < 20; i += 1) {
    const spellGroup = page.getByRole("group", { name: "Các chữ cái của từ" });
    if (await spellGroup.isVisible().catch(() => false)) {
      found = true;
      await expect(spellGroup.getByRole("textbox").first()).toBeVisible();
      break;
    }
    await answerCurrent(page);
    await page.getByRole("button", { name: /Tiếp theo|Xem kết quả/ }).click();
  }
  expect(found).toBe(true);
});

test("vòng có dạng sắp xếp chữ cái (unscramble), ghép được bằng click", async ({
  page,
}) => {
  await page.goto("/play/round-1");
  let found = false;
  for (let i = 0; i < 20; i += 1) {
    const tileList = page.getByRole("list", { name: "Chữ cái để chọn" });
    if (await tileList.isVisible().catch(() => false)) {
      found = true;
      const tiles = tileList.getByRole("button");
      const n = await tiles.count();
      expect(n).toBeGreaterThanOrEqual(2);
      // Ghép tất cả chữ rồi kiểm tra có phản hồi sau khi Kiểm tra.
      for (let k = 0; k < n; k += 1) {
        const enabled = tileList
          .getByRole("button")
          .and(page.locator("button:not([disabled])"))
          .first();
        if (await enabled.isVisible().catch(() => false)) await enabled.click();
      }
      await page.getByRole("button", { name: "Kiểm tra" }).click();
      await expect(
        page.getByRole("button", { name: /Tiếp theo|Xem kết quả/ })
      ).toBeVisible();
      break;
    }
    await answerCurrent(page);
    await page.getByRole("button", { name: /Tiếp theo|Xem kết quả/ }).click();
  }
  expect(found).toBe(true);
});
