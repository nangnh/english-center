import type { Page } from "@playwright/test";

// Mock speechSynthesis để e2e không phụ thuộc TTS thật.
// Mặc định: có giọng tiếng Anh (phát "thành công" nhưng không kêu).
export async function mockSpeech(page: Page, hasEnglish = true) {
  await page.addInitScript((has: boolean) => {
    const voices = has ? [{ lang: "en-US", name: "Mock EN" }] : [{ lang: "vi-VN", name: "VN" }];
    // @ts-expect-error gán mock
    window.speechSynthesis = {
      getVoices: () => voices,
      cancel: () => {},
      speak: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      onvoiceschanged: null,
    };
    // @ts-expect-error gán mock
    window.SpeechSynthesisUtterance = function (text: string) {
      // @ts-expect-error this
      this.text = text;
      // @ts-expect-error this
      this.lang = "";
      // @ts-expect-error this
      this.rate = 1;
    };
  }, hasEnglish);
}

// Trả lời tuần tự tất cả câu trong một lượt bằng cách luôn chọn
// lựa chọn/ô đầu tiên khả dụng, rồi Kiểm tra -> Tiếp theo.
// winAll=true cố gắng chọn đáp án đúng khi biết (không áp dụng ở đây).
export async function answerAllQuestions(page: Page, count: number) {
  for (let i = 0; i < count; i += 1) {
    await answerCurrent(page);
    // Nút chuyển: "Tiếp theo →" hoặc "Xem kết quả"
    const next = page.getByRole("button", { name: /Tiếp theo|Xem kết quả/ });
    await next.click();
  }
}

// Trả lời câu hiện tại theo dạng đang hiển thị.
export async function answerCurrent(page: Page) {
  // fill?
  const fillInput = page.getByLabel(/Ô nhập từ tiếng Anh/);
  if (await fillInput.isVisible().catch(() => false)) {
    await fillInput.fill("test");
    await clickCheck(page);
    return;
  }

  // matching? có hai cột; nối 3 cặp bằng cách bấm trái rồi phải.
  const leftList = page.getByRole("list", { name: "Từ tiếng Anh" });
  if (await leftList.isVisible().catch(() => false)) {
    const lefts = leftList.getByRole("button");
    const rights = page
      .getByRole("list", { name: "Nghĩa tiếng Việt" })
      .getByRole("button");
    const n = await lefts.count();
    for (let k = 0; k < n; k += 1) {
      await lefts.nth(k).click();
      await rights.nth(k).click();
    }
    await clickCheck(page);
    return;
  }

  // choice / picture / listening: chọn nút khả dụng đầu tiên trong danh sách.
  const firstOption = page.locator('ul[role="list"] button:not([disabled])').first();
  await firstOption.click();
  await clickCheck(page);
}

async function clickCheck(page: Page) {
  const check = page.getByRole("button", { name: "Kiểm tra" });
  await check.click();
}
