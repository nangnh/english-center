import { test, expect } from "@playwright/test";
import { mockSpeech, answerAllQuestions } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSpeech(page, true);
});

test("luyện nhanh: làm 5 câu và xem kết quả", async ({ page }) => {
  await page.goto("/play/quick-animals");
  await expect(page.getByText(/Câu 1\/5/)).toBeVisible();
  await answerAllQuestions(page, 5);
  await expect(page).toHaveURL(/\/results\//);
  await expect(
    page.getByRole("heading", { name: /Kết quả luyện nhanh/ })
  ).toBeVisible();
});

test("luyện nhanh không ảnh hưởng mở khóa vòng", async ({ page }) => {
  await page.goto("/play/quick-colours");
  await answerAllQuestions(page, 5);
  await expect(page).toHaveURL(/\/results\//);
  await page.goto("/rounds");
  // Vẫn chỉ vòng 1 mở.
  await expect(page.getByText("Chưa mở khóa").first()).toBeVisible();
});
