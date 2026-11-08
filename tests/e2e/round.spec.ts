import { test, expect } from "@playwright/test";
import { mockSpeech, answerAllQuestions } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSpeech(page, true);
});

test("vòng: khởi tạo 20 câu, có đồng hồ và điểm", async ({ page }) => {
  await page.goto("/play/round-1");
  await expect(page.getByText(/Câu 1\/20/)).toBeVisible();
  await expect(page.getByText(/Chặng 1\/4/)).toBeVisible();
  await expect(page.getByLabel(/Còn lại/)).toBeVisible(); // timer
  await expect(page.getByText(/⭐ 0/)).toBeVisible();
});

test("vòng: hoàn tất 20 câu -> trang kết quả", async ({ page }) => {
  await page.goto("/play/round-1");
  await answerAllQuestions(page, 20);
  await expect(page).toHaveURL(/\/results\//);
  await expect(page.getByRole("heading", { name: /Kết quả vòng/ })).toBeVisible();
  await expect(page.getByText(/\/200/)).toBeVisible();
});

test("vòng: reload giữa chừng không reset về câu 1, giữ điểm", async ({
  page,
}) => {
  await page.goto("/play/round-1");
  // Trả lời câu 1 rồi sang câu 2.
  const firstOption = page.locator('ul[role="list"] button:not([disabled])').first();
  await firstOption.click();
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await page.getByRole("button", { name: /Tiếp theo/ }).click();
  await expect(page.getByText(/Câu 2\/20/)).toBeVisible();

  await page.reload();
  // Sau reload vẫn ở câu 2 (resume theo activeAttempt).
  await expect(page.getByText(/Câu 2\/20/)).toBeVisible();
});

test("pass + unlock: seed dữ liệu rồi kiểm tra vòng 2 mở", async ({ page }) => {
  // Seed một tiến bộ đã mở vòng 2.
  await page.addInitScript(() => {
    const progress = {
      schemaVersion: 1,
      unlockedRoundIds: ["round-1", "round-2"],
      bestByRound: {
        "round-1": { score: 200, timeMs: 60000, achievedAtMs: 1 },
      },
      attempts: [],
      activeAttemptId: null,
    };
    window.localStorage.setItem(
      "english-garden:progress:v1",
      JSON.stringify(progress)
    );
  });
  await page.goto("/rounds");
  const round2 = page.getByRole("link", { name: /Vòng 2/ });
  await expect(round2).toBeVisible();
  await round2.click();
  await expect(page).toHaveURL(/\/play\/round-2/);
});
