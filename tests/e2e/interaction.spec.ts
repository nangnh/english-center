import { test, expect } from "@playwright/test";
import { mockSpeech } from "./helpers";
import questions from "../../src/data/questions.json";

type Q = (typeof questions)[number];

// Lặp lại pickQuick để biết câu đầu của quick-<topic>.
function pickQuick(ids: string[], n: number, seed: string): string[] {
  if (ids.length <= n) return [...ids];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const start = Math.abs(h) % ids.length;
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) out.push(ids[(start + i) % ids.length]);
  return out;
}

function firstQuickQuestion(topic: string): Q {
  const pool = (questions as Q[]).filter((q) => q.topic === topic);
  const ids = pickQuick(
    pool.map((q) => q.id),
    5,
    `quick-${topic}`
  );
  return (questions as Q[]).find((q) => q.id === ids[0])!;
}

test.beforeEach(async ({ page }) => {
  await mockSpeech(page, true);
});

test("có nút bật/tắt âm thanh và đổi được trạng thái", async ({ page }) => {
  await page.goto("/play/round-1");
  const toggle = page.getByRole("button", { name: /âm thanh/i });
  await expect(toggle).toBeVisible();
  const before = await toggle.getAttribute("aria-pressed");
  await toggle.click();
  const after = await toggle.getAttribute("aria-pressed");
  expect(after).not.toBe(before);
});

test("trả lời đúng hiện hiệu ứng tung hoa", async ({ page }) => {
  // Tìm một chủ đề mà câu đầu quick là dạng choice để chọn đúng xác định.
  const topics = ["animals", "food", "colors", "numbers", "family"];
  let chosen: { topic: string; q: Q } | null = null;
  for (const t of topics) {
    const q = firstQuickQuestion(t);
    if (q.kind === "choice") {
      chosen = { topic: t, q };
      break;
    }
  }
  expect(chosen, "cần ít nhất một chủ đề có câu choice đầu tiên").not.toBeNull();

  const { topic, q } = chosen!;
  await page.goto(`/play/quick-${topic}`);

  // Chọn đúng đáp án theo correctOptionId.
  const correct = q.options!.find((o) => o.id === q.correctOptionId)!;
  await page.getByRole("button", { name: correct.textEn, exact: true }).click();
  await page.getByRole("button", { name: "Kiểm tra" }).click();

  // Hiệu ứng tung hoa xuất hiện (overlay testid=confetti) và phản hồi đúng.
  await expect(page.getByTestId("confetti")).toBeVisible();
  await expect(page.getByText(/Tuyệt vời/)).toBeVisible();
});

test("câu nhập chữ tự động focus vào ô nhập (fill hoặc spell-fill)", async ({
  page,
}) => {
  await page.goto("/play/round-1");

  let focusedOk = false;
  for (let i = 0; i < 20; i += 1) {
    const fillInput = page.getByLabel(/Ô nhập từ tiếng Anh/);
    const spellGroup = page.getByRole("group", { name: "Các chữ cái của từ" });

    if (await fillInput.isVisible().catch(() => false)) {
      await expect(fillInput).toBeFocused();
      focusedOk = true;
      break;
    }
    if (await spellGroup.isVisible().catch(() => false)) {
      // Ô chữ cái đầu tiên được focus tự động.
      const firstBox = spellGroup.getByRole("textbox").first();
      await expect(firstBox).toBeFocused();
      focusedOk = true;
      break;
    }

    // Không phải dạng nhập: trả lời nhanh rồi sang câu kế.
    const firstOption = page
      .locator('ul[role="list"] button:not([disabled])')
      .first();
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click();
    } else {
      // matching/unscramble: bỏ qua bằng cách nối/ghép tối thiểu không cần;
      // chọn mọi nút khả dụng để có thể Kiểm tra.
      const anyBtn = page.locator("main button:not([disabled])").first();
      await anyBtn.click();
    }
    const check = page.getByRole("button", { name: "Kiểm tra" });
    if (await check.isEnabled().catch(() => false)) await check.click();
    await page
      .getByRole("button", { name: /Tiếp theo|Xem kết quả/ })
      .click()
      .catch(() => {});
  }

  expect(focusedOk).toBe(true);
});
