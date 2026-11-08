import { test, expect } from "@playwright/test";
import { mockSpeech } from "./helpers";

test("hết giờ bằng đồng hồ giả -> tự kết thúc sang kết quả", async ({
  page,
}) => {
  await mockSpeech(page, true);
  // Cài đồng hồ giả trước khi tải trang.
  await page.clock.install();
  await page.goto("/play/round-1");
  await expect(page.getByText(/Câu 1\/20/)).toBeVisible();

  // Nhảy qua mốc 30 phút; engine TICK sẽ kết thúc lượt.
  await page.clock.runFor(31 * 60 * 1000);

  await expect(page).toHaveURL(/\/results\//, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: /Kết quả vòng/ })).toBeVisible();
});
