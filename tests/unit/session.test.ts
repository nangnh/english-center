import { describe, it, expect } from "vitest";
import {
  resolvePlayParam,
  pickQuick,
  nextRoundIdOf,
} from "@/lib/session";

describe("session resolver", () => {
  it("giải mã vòng hợp lệ", () => {
    const r = resolvePlayParam("round-1");
    expect(r?.mode).toBe("round");
    expect(r?.roundId).toBe("round-1");
    expect(r?.questionIds.length).toBe(20);
  });

  it("giải mã luyện nhanh theo chủ đề: 5 câu", () => {
    const r = resolvePlayParam("quick-animals");
    expect(r?.mode).toBe("quick");
    expect(r?.topic).toBe("animals");
    expect(r?.questionIds.length).toBe(5);
  });

  it("param sai trả null", () => {
    expect(resolvePlayParam("khong-ton-tai")).toBeNull();
    expect(resolvePlayParam("quick-khong-co")).toBeNull();
  });

  it("pickQuick ổn định với cùng seed", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g"];
    const first = pickQuick(ids, 5, "quick-animals");
    const second = pickQuick(ids, 5, "quick-animals");
    expect(first).toEqual(second);
    expect(first.length).toBe(5);
  });

  it("nextRoundIdOf trả vòng kế, vòng cuối trả undefined", () => {
    expect(nextRoundIdOf("round-1")).toBe("round-2");
    expect(nextRoundIdOf("round-8")).toBeUndefined();
  });
});
