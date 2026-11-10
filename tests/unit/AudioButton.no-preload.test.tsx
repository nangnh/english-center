// Feature: native-pronunciation, Property 12: Không preload lúc mở trang.
// For any page with n questions, after the first render and BEFORE any user
// interaction, the number of HTMLAudioElement created (files preloaded) SHALL
// be 0. Validates: Requirements 5.5.
//
// Cách đo: AudioButton chỉ tạo `new Audio(src)` bên trong `playText` (qua
// createAudio: (src) => new Audio(src) trong ensureEnv), và ensureEnv chỉ chạy
// khi người dùng bấm. Ta spy trực tiếp lên global Audio constructor, đếm số lần
// khởi tạo: bất kỳ hành vi preload nào (kể cả ngoài dự kiến) đều tăng counter.
// Spy là độc lập với các mock module bên dưới, nên vẫn bắt được preload thật.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import fc from "fast-check";
import { AudioButton } from "@/components/AudioButton";

// Mock manifest: resolve nhanh về manifest rỗng để render hermetic, không phụ
// thuộc fetch/mạng. (Dù rỗng hay không, mount KHÔNG được tạo Audio.)
vi.mock("@/lib/audioManifest", () => ({
  getAudioManifest: () =>
    Promise.resolve({ version: 1, byText: {} as Record<string, string> }),
}));

// Mock speech: no-op env, để ensureEnv (nếu có chạy) không chạm Web Speech thật.
vi.mock("@/lib/speech", () => ({
  getBrowserSpeechEnv: () => ({
    synth: null,
    makeUtterance: () => ({}) as SpeechSynthesisUtterance,
  }),
  speak: () => "unavailable" as const,
  cancelSpeech: () => {},
  hasEnglishVoice: () => false,
}));

// Đếm số lần global Audio được khởi tạo. Stub này độc lập với mọi module mock
// ở trên: nếu component preload (new Audio(...)) lúc mount, counter sẽ > 0.
let audioConstructionCount = 0;

class CountingAudioStub {
  constructor(..._args: unknown[]) {
    audioConstructionCount += 1;
  }
  // Tối thiểu API dùng trong playText (không bao giờ nên bị gọi ở mount).
  addEventListener(): void {}
  removeEventListener(): void {}
  pause(): void {}
  play(): Promise<void> {
    return Promise.resolve();
  }
}

beforeEach(() => {
  audioConstructionCount = 0;
  vi.stubGlobal("Audio", CountingAudioStub as unknown as typeof Audio);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AudioButton (R5.5) — không preload lúc mở trang", () => {
  it("Property 12: với số câu n bất kỳ, 0 Audio được tạo trước tương tác", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Số AudioButton (mô phỏng số câu trên trang) và văn bản khác nhau.
        fc.integer({ min: 0, max: 20 }),
        fc.array(fc.string({ minLength: 1, maxLength: 12 }), {
          minLength: 0,
          maxLength: 20,
        }),
        async (n, texts) => {
          audioConstructionCount = 0;

          // Render n AudioButton với văn bản phân biệt — KHÔNG tương tác gì.
          await act(async () => {
            render(
              <div>
                {Array.from({ length: n }, (_, i) => (
                  <AudioButton key={i} text={texts[i] ?? `word-${i}`} />
                ))}
              </div>
            );
          });

          // Flush mọi microtask/effect bất đồng bộ (component có thể await
          // getAudioManifest trong effect/handler — nhưng KHÔNG tạo Audio ở mount).
          await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
          });

          // Bất biến: không có HTMLAudioElement nào được tạo trước tương tác.
          expect(audioConstructionCount).toBe(0);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
