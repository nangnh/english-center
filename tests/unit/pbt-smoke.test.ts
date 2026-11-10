import { describe, it, expect } from "vitest";
import fc from "fast-check";

// Feature: native-pronunciation, Property smoke: xác nhận cấu hình PBT (fast-check)
// hoạt động với Vitest hiện có bằng một property đơn giản chạy >= 100 vòng.
describe("PBT smoke (native-pronunciation)", () => {
  it("fast-check chạy fc.assert với numRuns: 100", () => {
    let runs = 0;

    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        runs += 1;
        // Cộng số nguyên có tính giao hoán — tính chất phải đúng với mọi đầu vào.
        return a + b === b + a;
      }),
      { numRuns: 100 }
    );

    expect(runs).toBeGreaterThanOrEqual(100);
  });
});
