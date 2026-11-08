import { test, expect } from "@playwright/test";

test("tiến bộ: ghi rõ trên thiết bị này và không liên kết IOE", async ({
  page,
}) => {
  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: "Tiến bộ" })
  ).toBeVisible();
  await expect(page.getByText(/Trên thiết bị này/i).first()).toBeVisible();
  await expect(page.getByText(/Không liên kết.*IOE/i)).toBeVisible();
});

test("xóa dữ liệu cần xác nhận hai bước", async ({ page }) => {
  // Seed để có dữ liệu rồi xóa.
  await page.addInitScript(() => {
    const progress = {
      schemaVersion: 1,
      unlockedRoundIds: ["round-1", "round-2", "round-3"],
      bestByRound: { "round-1": { score: 200, timeMs: 1000, achievedAtMs: 1 } },
      attempts: [],
      activeAttemptId: null,
    };
    window.localStorage.setItem(
      "english-garden:progress:v1",
      JSON.stringify(progress)
    );
  });
  await page.goto("/progress");
  await expect(page.getByText("Đã mở khóa: 3/8 vòng")).toBeVisible();

  // Bước 1: hiện nút xác nhận.
  await page.getByRole("button", { name: /Xóa dữ liệu…/ }).click();
  await expect(
    page.getByRole("button", { name: /Bấm lần nữa để xác nhận/ })
  ).toBeVisible();

  // Bước 2: xác nhận xóa -> về 1/8.
  await page.getByRole("button", { name: /Bấm lần nữa để xác nhận/ }).click();
  await expect(page.getByText("Đã mở khóa: 1/8 vòng")).toBeVisible();
});
