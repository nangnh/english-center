import { describe, it, expect, vi } from "vitest";
import {
  speak,
  cancelSpeech,
  hasEnglishVoice,
  pickEnglishVoice,
  type SpeechEnv,
} from "@/lib/speech";

function makeUtterance() {
  return {
    lang: "",
    rate: 1,
    voice: undefined,
  } as unknown as SpeechSynthesisUtterance;
}

function envWith(
  voices: Array<{ lang: string; name: string }>,
  opts: { speakThrows?: boolean } = {}
): { env: SpeechEnv; cancel: ReturnType<typeof vi.fn>; speakFn: ReturnType<typeof vi.fn> } {
  const cancel = vi.fn();
  const speakFn = vi.fn(() => {
    if (opts.speakThrows) throw new Error("speak failed");
  });
  const synth = {
    getVoices: () => voices as unknown as SpeechSynthesisVoice[],
    cancel,
    speak: speakFn,
  } as unknown as SpeechSynthesis;
  const env: SpeechEnv = {
    synth,
    makeUtterance: () => makeUtterance(),
  };
  return { env, cancel, speakFn };
}

describe("speech lib (R5)", () => {
  it("không có synth -> unavailable", () => {
    const env: SpeechEnv = { synth: null, makeUtterance: () => makeUtterance() };
    expect(speak(env, "cat")).toBe("unavailable");
    expect(hasEnglishVoice(env)).toBe(false);
  });

  it("có synth nhưng không có giọng tiếng Anh -> unavailable", () => {
    const { env } = envWith([{ lang: "vi-VN", name: "Vietnamese" }]);
    expect(hasEnglishVoice(env)).toBe(false);
    expect(speak(env, "cat")).toBe("unavailable");
  });

  it("có giọng tiếng Anh -> spoken, hủy phát trước, rate ~0.8", () => {
    const { env, cancel, speakFn } = envWith([
      { lang: "en-US", name: "US English" },
    ]);
    expect(speak(env, "cat")).toBe("spoken");
    expect(cancel).toHaveBeenCalledTimes(1); // replay: hủy trước
    expect(speakFn).toHaveBeenCalledTimes(1);
    const u = speakFn.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(u.rate).toBeCloseTo(0.8);
    expect(u.lang).toBe("en-US");
  });

  it("speak ném lỗi -> error", () => {
    const { env } = envWith([{ lang: "en-US", name: "US" }], {
      speakThrows: true,
    });
    expect(speak(env, "cat")).toBe("error");
  });

  it("ưu tiên en-US, rồi en-GB, rồi en bất kỳ", () => {
    const { env } = envWith([
      { lang: "en-AU", name: "AU" },
      { lang: "en-GB", name: "GB" },
      { lang: "en-US", name: "US" },
    ]);
    expect(pickEnglishVoice(env)?.lang).toBe("en-US");

    const { env: env2 } = envWith([
      { lang: "en-AU", name: "AU" },
      { lang: "en-GB", name: "GB" },
    ]);
    expect(pickEnglishVoice(env2)?.lang).toBe("en-GB");

    const { env: env3 } = envWith([{ lang: "en-AU", name: "AU" }]);
    expect(pickEnglishVoice(env3)?.lang).toBe("en-AU");
  });

  it("cancelSpeech gọi synth.cancel, không ném khi null", () => {
    const { env, cancel } = envWith([{ lang: "en-US", name: "US" }]);
    cancelSpeech(env);
    expect(cancel).toHaveBeenCalled();
    const nullEnv: SpeechEnv = { synth: null, makeUtterance: () => makeUtterance() };
    expect(() => cancelSpeech(nullEnv)).not.toThrow();
  });
});
