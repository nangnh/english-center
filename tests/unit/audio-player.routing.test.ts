import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { playText, type AudioEnv, type AudioManifest } from "@/lib/audio";
import { normalizeText } from "@/lib/audio-key";
import type { SpeechEnv } from "@/lib/speech";

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/**
 * A minimal fake HTMLAudioElement: an EventTarget-like object that records the
 * `src` it was created with, exposes addEventListener/removeEventListener/pause,
 * and lets the test deterministically emit "playing"/"canplay"/"error" events.
 * `play()` returns a configurable promise (resolved by default, or a never /
 * rejecting promise to exercise the thenable-probe branch of playText).
 */
interface FakeAudio {
  el: HTMLAudioElement;
  src: string;
  paused: boolean;
  playCalled: number;
  emit: (type: "playing" | "canplay" | "error") => void;
  listenerCount: () => number;
}

type PlayMode = "resolve" | "reject" | "pending";

function makeFakeAudio(src: string, playMode: PlayMode): FakeAudio {
  const listeners = new Map<string, Set<() => void>>();

  const addEventListener = (type: string, cb: () => void) => {
    let set = listeners.get(type);
    if (!set) {
      set = new Set();
      listeners.set(type, set);
    }
    set.add(cb);
  };

  const removeEventListener = (type: string, cb: () => void) => {
    listeners.get(type)?.delete(cb);
  };

  const fake: FakeAudio = {
    src,
    paused: false,
    playCalled: 0,
    emit: (type) => {
      // Copy to array so listeners that remove themselves don't disturb iteration.
      for (const cb of Array.from(listeners.get(type) ?? [])) cb();
    },
    listenerCount: () =>
      ["playing", "canplay", "error"].reduce(
        (n, t) => n + (listeners.get(t)?.size ?? 0),
        0
      ),
    // placeholder, assigned below
    el: undefined as unknown as HTMLAudioElement,
  };

  const el = {
    addEventListener,
    removeEventListener,
    pause: () => {
      fake.paused = true;
    },
    play: () => {
      fake.playCalled += 1;
      if (playMode === "resolve") return Promise.resolve();
      if (playMode === "reject") return Promise.reject(new Error("play failed"));
      // "pending": a promise that never settles (simulate stalled load)
      return new Promise<void>(() => {});
    },
  } as unknown as HTMLAudioElement;

  fake.el = el;
  return fake;
}

/** Build a SpeechEnv whose synth exposes a configurable voice list. speak()
 *  returns "spoken" iff some voice.lang starts with "en" (case-insensitive). */
function makeSpeechEnv(voiceLangs: string[]): SpeechEnv {
  const synth = {
    getVoices: () =>
      voiceLangs.map((lang) => ({ lang, name: lang })) as unknown as SpeechSynthesisVoice[],
    cancel: () => {},
    speak: () => {},
  } as unknown as SpeechSynthesis;
  return {
    synth,
    makeUtterance: () =>
      ({ lang: "", rate: 1, voice: undefined }) as unknown as SpeechSynthesisUtterance,
  };
}

function hasEnglish(voiceLangs: string[]): boolean {
  return voiceLangs.some((l) => /^en(-|$)/i.test(l));
}

/** Assemble an AudioEnv around the fakes, controlling now() explicitly. */
function makeEnv(opts: {
  manifest: AudioManifest;
  voiceLangs: string[];
  playMode: PlayMode;
  nowRef: { t: number };
  createdSrcs: string[];
  fakes: FakeAudio[];
}): AudioEnv {
  return {
    manifest: opts.manifest,
    createAudio: (src: string) => {
      opts.createdSrcs.push(src);
      const fa = makeFakeAudio(src, opts.playMode);
      opts.fakes.push(fa);
      return fa.el;
    },
    speechEnv: makeSpeechEnv(opts.voiceLangs),
    now: () => opts.nowRef.t,
  };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

// Internal mp3 path matching the runtime-only constraint (Property 14).
const internalPath = fc
  .hexaString({ minLength: 4, maxLength: 16 })
  .map((h) => `/audio/${h}.mp3`);

// Names inherited from Object.prototype — excluded so a bare-object manifest
// lookup for a MISS text can't accidentally resolve to an inherited member
// (e.g. "constructor", "toString"). This keeps generated keys realistic.
const OBJECT_PROTO_NAMES = new Set(Object.getOwnPropertyNames(Object.prototype));

// Non-empty, non-whitespace-only text so normalizeText produces a stable key,
// excluding Object.prototype member names.
const nonEmptyText = fc
  .string({ minLength: 1, maxLength: 24 })
  .filter(
    (s) =>
      normalizeText(s).length > 0 &&
      !OBJECT_PROTO_NAMES.has(normalizeText(s))
  );

// A manifest: map of normalized text -> internal mp3 path.
const manifestArb = fc
  .array(fc.tuple(nonEmptyText, internalPath), { maxLength: 8 })
  .map((pairs) => {
    const byText: Record<string, string> = {};
    for (const [t, p] of pairs) byText[normalizeText(t)] = p;
    return { version: 1, byText } as AudioManifest;
  });

// Voice lists with and without en-* entries (case-insensitive).
const enLangArb = fc.constantFrom(
  "en",
  "en-US",
  "en-GB",
  "en-AU",
  "EN-us",
  "En-Gb"
);
const nonEnLangArb = fc.constantFrom(
  "vi-VN",
  "fr-FR",
  "de-DE",
  "es-ES",
  "ja-JP",
  "zh-CN"
);
const voiceListArb = fc.array(fc.oneof(enLangArb, nonEnLangArb), {
  maxLength: 5,
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("Audio_Player routing & fallback (native-pronunciation)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Feature: native-pronunciation, Property 8: For any manifest and text t, a
  // HIT (normalizeText(t) in byText) creates an HTMLAudioElement with src exactly
  // equal to byText[key] and, when "playing" is emitted, resolves "played-file";
  // a MISS creates no audio and falls back to speak -> "fallback-spoken" (en voice)
  // or "unavailable" (no en voice).
  // Validates: Requirements 2.4, 3.1
  it("Property 8: selects source by manifest (hit -> file, miss -> fallback)", async () => {
    await fc.assert(
      fc.asyncProperty(
        manifestArb,
        nonEmptyText,
        voiceListArb,
        async (manifest, rawText, voiceLangs) => {
          const key = normalizeText(rawText);
          const nowRef = { t: 1000 };
          const createdSrcs: string[] = [];
          const fakes: FakeAudio[] = [];
          const env = makeEnv({
            manifest,
            voiceLangs,
            playMode: "pending", // don't let play() resolve; we drive events
            nowRef,
            createdSrcs,
            fakes,
          });

          const hit = Object.prototype.hasOwnProperty.call(
            manifest.byText,
            key
          );

          if (hit) {
            const promise = playText(env, rawText);
            // Exactly one audio created, src equals the manifest entry.
            expect(createdSrcs).toEqual([manifest.byText[key]]);
            expect(fakes).toHaveLength(1);
            // Drive success.
            fakes[0].emit("playing");
            const outcome = await promise;
            expect(outcome).toBe("played-file");
          } else {
            const outcome = await playText(env, rawText);
            // No audio element created on a miss.
            expect(createdSrcs).toHaveLength(0);
            expect(outcome).toBe(
              hasEnglish(voiceLangs) ? "fallback-spoken" : "unavailable"
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: native-pronunciation, Property 9: For a manifest HIT, when playback
  // fails (error event) OR stalls past 3s (timer fires with now() advanced >=3000),
  // Audio_Player stops the file audio (pause) and falls back to speech. Outcome is
  // "fallback-spoken"/"unavailable" per voice availability.
  // Validates: Requirements 3.2, 5.2
  it("Property 9: degrades on playback error or 3s timeout", async () => {
    const hitManifestAndText = manifestArb
      .filter((m) => Object.keys(m.byText).length > 0)
      .chain((m) =>
        fc
          .constantFrom(...Object.keys(m.byText))
          .map((key) => ({ manifest: m, key }))
      );

    await fc.assert(
      fc.asyncProperty(
        hitManifestAndText,
        voiceListArb,
        fc.constantFrom<"error" | "timeout">("error", "timeout"),
        async ({ manifest, key }, voiceLangs, scenario) => {
          const nowRef = { t: 5000 };
          const createdSrcs: string[] = [];
          const fakes: FakeAudio[] = [];
          const env = makeEnv({
            manifest,
            voiceLangs,
            playMode: "pending", // never resolve via play(); drive failure explicitly
            nowRef,
            createdSrcs,
            fakes,
          });

          const expected = hasEnglish(voiceLangs)
            ? "fallback-spoken"
            : "unavailable";

          // `key` is already normalized; feeding it keeps the HIT.
          const promise = playText(env, key);
          expect(fakes).toHaveLength(1);
          const fake = fakes[0];

          if (scenario === "error") {
            fake.emit("error");
          } else {
            // Advance clock past the 3s threshold, then fire the timer.
            nowRef.t += 3000;
            vi.advanceTimersByTime(3000);
          }

          const outcome = await promise;
          expect(outcome).toBe(expected);
          // The file audio was stopped (stopCurrent -> pause).
          expect(fake.paused).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: native-pronunciation, Property 10: For any generated voice list,
  // Speech_Fallback availability holds iff some voice.lang starts with "en"
  // (case-insensitive). Driven via a manifest MISS so the outcome is decided
  // purely by the fallback: "fallback-spoken" iff an en-voice exists else
  // "unavailable".
  // Validates: Requirements 3.3
  it("Property 10: Speech_Fallback available iff an en voice exists", async () => {
    await fc.assert(
      fc.asyncProperty(voiceListArb, nonEmptyText, async (voiceLangs, rawText) => {
        const nowRef = { t: 0 };
        const createdSrcs: string[] = [];
        const fakes: FakeAudio[] = [];
        // Empty manifest guarantees a MISS -> pure fallback path. Null-prototype
        // map so no inherited member can masquerade as a manifest entry.
        const env = makeEnv({
          manifest: {
            version: 1,
            byText: Object.create(null) as Record<string, string>,
          },
          voiceLangs,
          playMode: "resolve",
          nowRef,
          createdSrcs,
          fakes,
        });

        const outcome = await playText(env, rawText);
        const available = outcome === "fallback-spoken";
        expect(available).toBe(hasEnglish(voiceLangs));
        // Missing manifest never touches the file audio path.
        expect(createdSrcs).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: native-pronunciation, Property 14: Runtime uses internal sources
  // only. Every value in manifest.byText matches ^/audio/.*\.mp3$, and on a HIT
  // createAudio is only ever called with such an internal path (never an external
  // URL).
  // Validates: Requirements 4.2
  it("Property 14: runtime uses internal-only /audio/*.mp3 sources", async () => {
    const internalRe = /^\/audio\/.*\.mp3$/;

    await fc.assert(
      fc.asyncProperty(manifestArb, voiceListArb, async (manifest, voiceLangs) => {
        // Every manifest value is an internal mp3 path.
        for (const p of Object.values(manifest.byText)) {
          expect(p).toMatch(internalRe);
        }

        const keys = Object.keys(manifest.byText);
        if (keys.length === 0) return; // nothing to route

        const key = keys[0];
        const nowRef = { t: 0 };
        const createdSrcs: string[] = [];
        const fakes: FakeAudio[] = [];
        const env = makeEnv({
          manifest,
          voiceLangs,
          playMode: "pending",
          nowRef,
          createdSrcs,
          fakes,
        });

        const promise = playText(env, key);
        // createAudio invoked only with internal paths.
        expect(createdSrcs).toHaveLength(1);
        for (const s of createdSrcs) expect(s).toMatch(internalRe);
        // Settle to avoid dangling pending promise/timer.
        fakes[0].emit("playing");
        await promise;
      }),
      { numRuns: 100 }
    );
  });
});
