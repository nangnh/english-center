import { test, expect } from "@playwright/test";

test("trang chủ hiển thị 3 lối vào chính", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /English Garden/i })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Luyện nhanh" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vòng luyện" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tiến bộ" })).toBeVisible();
});

test("không tràn ngang ở màn hình 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientW = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollW).toBeLessThanOrEqual(clientW + 1);
});

test("điều hướng chủ đề và vòng", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Luyện nhanh" }).click();
  await expect(page).toHaveURL(/\/topics/);
  await page.goBack();
  await page.getByRole("heading", { name: "Vòng luyện" }).click();
  await expect(page).toHaveURL(/\/rounds/);
  // Vòng 1 mở, vòng 2 khóa.
  await expect(page.getByText("Vòng 1")).toBeVisible();
  await expect(page.getByText("Chưa mở khóa").first()).toBeVisible();
});
