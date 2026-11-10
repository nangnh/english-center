import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import {
  playText,
  playEncouragement,
  type AudioEnv,
  type AudioManifest,
} from "@/lib/audio";
import type { SpeechEnv } from "@/lib/speech";

// NOTE: tệp test này TÁCH RIÊNG khỏi test routing/fallback (task 6.3) vì
// src/lib/audio.ts giữ một tham chiếu `currentAudio` ở cấp module. Giữ hai nhóm
// property ở hai tệp khác nhau để trạng thái module được cô lập theo từng tệp.

// ---------------------------------------------------------------------------
// Fake HTMLAudioElement: ghi lại pause() và cho phép phát "playing"/"error".
// ---------------------------------------------------------------------------

type FakeListener = () => void;

class FakeAudio {
  src: string;
  paused = true;
  pauseCount = 0;
  playCalls = 0;
  playThrows = false;
  // play() trả về một Promise không bao giờ resolve theo mặc định (pending),
  // để chúng ta chủ động điều khiển kết quả qua emit("playing"/"error").
  private listeners: Record<string, FakeListener[]> = {};

  constructor(src: string, opts: { playThrows?: boolean } = {}) {
    this.src = src;
    this.playThrows = opts.playThrows ?? false;
  }

  addEventListener(type: string, cb: FakeListener) {
    (this.listeners[type] ??= []).push(cb);
  }

  removeEventListener(type: string, cb: FakeListener) {
    const arr = this.listeners[type];
    if (!arr) return;
    const i = arr.indexOf(cb);
    if (i >= 0) arr.splice(i, 1);
  }

  play(): Promise<void> {
    this.playCalls += 1;
    this.paused = false;
    if (this.playThrows) throw new Error("play() threw synchronously");
    // Pending promise: không resolve/reject tự động.
    return new Promise<void>(() => {});
  }

  pause() {
    this.pauseCount += 1;
    this.paused = true;
  }

  emit(type: "playing" | "canplay" | "error") {
    for (const cb of [...(this.listeners[type] ?? [])]) cb();
  }
}

/**
 * Tạo một AudioEnv với createAudio trả về FakeAudio mới mỗi lần gọi, ghi lại
 * các phần tử theo thứ tự tạo. Cho phép cấu hình speech fallback và lỗi
 * createAudio/play.
 */
function makeEnv(opts: {
  byText?: Record<string, string>;
  createAudioThrows?: boolean;
  playThrows?: boolean;
} = {}): {
  env: AudioEnv;
  created: FakeAudio[];
} {
  const created: FakeAudio[] = [];
  const manifest: AudioManifest = {
    version: 1,
    byText: opts.byText ?? {},
  };

  // Audio_Player gọi speak(...) từ module speech (được mock ở dưới), nên speechEnv
  // chỉ cần là placeholder hợp lệ về kiểu.
  const speechEnv = {
    synth: {} as unknown,
    makeUtterance: () => ({}) as SpeechSynthesisUtterance,
  } as unknown as SpeechEnv;

  const env: AudioEnv = {
    manifest,
    createAudio: (src: string) => {
      if (opts.createAudioThrows) throw new Error("createAudio threw");
      const a = new FakeAudio(src, { playThrows: opts.playThrows });
      created.push(a);
      return a as unknown as HTMLAudioElement;
    },
    speechEnv,
    now: () => 0,
  };

  return { env, created };
}

// Audio_Player ủy quyền fallback cho speak() của src/lib/speech. Mock module để
// điều khiển kết quả fallback mà không cần DOM speechSynthesis thật.
let speakResult: "spoken" | "unavailable" | "error" = "spoken";
let speakThrows = false;
vi.mock("@/lib/speech", () => ({
  speak: (..._args: unknown[]) => {
    if (speakThrows) throw new Error("speak threw");
    return speakResult;
  },
}));

beforeEach(() => {
  speakResult = "spoken";
  speakThrows = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Audio_Player — dừng audio & non-blocking encouragement", () => {
  // -------------------------------------------------------------------------
  // Feature: native-pronunciation, Property 13: Dừng âm thanh đang phát trước
  // khi phát mới. For any chuỗi >= 2 lần playText HIT liên tiếp, trước khi
  // createAudio của lần N được gọi, phần tử audio của lần N-1 đã bị pause()
  // (stopCurrent chạy đồng bộ ở đầu playText trên nhánh hit).
  // Validates: Requirements 6.3
  // -------------------------------------------------------------------------
  it("Property 13: pause audio trước đó trước khi phát audio mới", () => {
    fc.assert(
      fc.property(
        // chuỗi >= 2 khóa, mọi khóa đều HIT manifest
        fc.array(fc.string({ minLength: 1, maxLength: 12 }), {
          minLength: 2,
          maxLength: 6,
        }),
        (rawKeys) => {
          // Xây manifest sao cho MỌI khóa (sau normalize) đều hit.
          const byText: Record<string, string> = {};
          const normalizedKeys = rawKeys.map((k) =>
            k.trim().replace(/\s+/g, " ")
          );
          normalizedKeys.forEach((nk, i) => {
            // tránh chuỗi rỗng sau normalize
            const key = nk.length > 0 ? nk : `k${i}`;
            byText[key] = `/audio/${i}.mp3`;
          });
          const keys = Object.keys(byText);
          // cần >= 2 khóa phân biệt để có N-1 và N; nếu không đủ, bỏ qua vòng
          fc.pre(keys.length >= 2);

          const { env, created } = makeEnv({ byText });

          // Phát tuần tự, mỗi lần để pending (không emit), rồi phát lần kế tiếp.
          const promises: Promise<unknown>[] = [];
          for (const key of keys) {
            promises.push(playText(env, key));
          }
          // nuốt các promise pending để tránh rò rỉ
          promises.forEach((p) => p.catch(() => {}));

          // Mỗi phần tử trừ phần tử cuối phải đã bị pause >= 1 lần, vì lần phát
          // kế tiếp gọi stopCurrent() (pause currentAudio) ở đầu playText.
          for (let i = 0; i < created.length - 1; i++) {
            expect(created[i].pauseCount).toBeGreaterThanOrEqual(1);
          }
          // Kiểm chứng cụ thể: phần tử liền trước phần tử cuối đã bị pause.
          if (created.length >= 2) {
            const lastButOne = created[created.length - 2];
            expect(lastButOne.pauseCount).toBeGreaterThanOrEqual(1);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Feature: native-pronunciation, Property 16: Phát câu động viên là không
  // chặn (non-blocking). For any encouragement text và bất kỳ hành vi phát nào
  // được inject (hit→error, hit→pending/timeout, miss→unavailable, hoặc
  // createAudio/play ném đồng bộ), playEncouragement(env, text) phải: (a) trả về
  // undefined đồng bộ, (b) KHÔNG ném, và (c) để nguyên trạng thái câu hỏi bên
  // ngoài. Không có unhandledRejection nào được phép nổi lên.
  // Validates: Requirements 8.4
  // -------------------------------------------------------------------------
  it("Property 16: playEncouragement không chặn, không ném, không đổi trạng thái", async () => {
    // Bắt mọi unhandledRejection trong suốt property để khẳng định fire-and-forget
    // không làm rò rỉ rejection.
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          // Kịch bản hành vi phát được inject.
          fc.constantFrom(
            "hit-error",
            "hit-pending",
            "miss-unavailable",
            "miss-spoken",
            "create-throws",
            "play-throws",
            "speak-throws"
          ),
          async (text, scenario) => {
            // Reset trạng thái fallback cho MỖI vòng lặp (không để rò rỉ giữa các
            // vòng — beforeEach chỉ chạy một lần cho cả property).
            speakResult = "spoken";
            speakThrows = false;

            const key = text.trim().replace(/\s+/g, " ") || "e";

            // Cấu hình env + fallback theo kịch bản.
            const isHit =
              scenario === "hit-error" ||
              scenario === "hit-pending" ||
              scenario === "create-throws" ||
              scenario === "play-throws";

            // fallback speak result/throw
            if (scenario === "miss-unavailable" || scenario === "hit-error") {
              // hit-error: khi phát tệp lỗi, playText suy biến sang speak và coi
              // như không khả dụng -> PlayOutcome "unavailable" được nuốt.
              speakResult = "unavailable";
            } else if (scenario === "speak-throws") {
              // speak-throws chỉ áp cho nhánh MISS: speak được gọi ĐỒNG BỘ trong
              // playText nên lỗi (nếu có) bị bắt bởi try/catch của playEncouragement.
              speakThrows = true;
            }

            const { env, created } = makeEnv({
              // isHit đã loại "speak-throws" (nhánh miss, không có khóa manifest).
              byText: isHit ? { [key]: "/audio/e.mp3" } : {},
              createAudioThrows: scenario === "create-throws",
              playThrows: scenario === "play-throws",
            });

            // "Trạng thái câu hỏi" bên ngoài — snapshot sâu trước khi gọi.
            const questionState = {
              index: 3,
              answered: false,
              selected: null as string | null,
              score: 42,
            };
            const before = JSON.parse(JSON.stringify(questionState));

            // (a) trả về undefined đồng bộ, (b) không ném.
            let returned: unknown = "sentinel";
            expect(() => {
              returned = playEncouragement(env, text);
            }).not.toThrow();
            expect(returned).toBeUndefined();

            // Với kịch bản hit-error, chủ động phát sự kiện error để đẩy
            // playText vào nhánh fallback (và nuốt rejection nếu có).
            if (scenario === "hit-error" && created.length > 0) {
              created[created.length - 1].emit("error");
            }

            // Đợi microtask/tick để mọi rejection (nếu có) kịp nổi lên.
            await Promise.resolve();
            await new Promise((r) => setTimeout(r, 0));

            // (c) trạng thái câu hỏi không đổi — playEncouragement không có quyền
            // truy cập nó, nên fire-and-forget không được làm lộ lỗi ảnh hưởng tới caller.
            expect(questionState).toEqual(before);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }

    // Không có rejection nào được phép rò rỉ ra ngoài (fire-and-forget nuốt hết).
    expect(unhandled).toEqual([]);
  });
});
