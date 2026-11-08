import { describe, it, expect } from "vitest";

// Test khởi tạo: xác nhận môi trường test hoạt động trước khi có logic thật.
describe("scaffold", () => {
  it("môi trường test chạy được", () => {
    expect(1 + 1).toBe(2);
  });
});
