import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { normalizeText } from "../../src/lib/audio-key";

// Feature: native-pronunciation, Property 2: For any string s, normalizeText is
// deterministic & idempotent — normalizeText(normalizeText(s)) === normalizeText(s),
// and the result has no leading/trailing whitespace and no consecutive whitespace runs.
// Validates: Requirements 7.1
describe("audio-key normalizeText (native-pronunciation, Property 2)", () => {
  // Generator: plain strings plus strings deliberately injected with runs of
  // whitespace (spaces, tabs, newlines, CR, form feed) to exercise collapsing.
  const whitespaceChars = [" ", "\t", "\n", "\r", "\f", "\v", "  ", "\t\n "];
  const whitespaceBlob = fc
    .array(fc.constantFrom(...whitespaceChars), { maxLength: 6 })
    .map((parts) => parts.join(""));
  const wordish = fc.string();

  // Build strings interleaving words with whitespace blobs so there are many
  // leading/trailing and internal consecutive-whitespace cases.
  const spacedString = fc
    .array(fc.oneof(wordish, whitespaceBlob), { maxLength: 8 })
    .map((parts) => parts.join(""));

  const anyString = fc.oneof(fc.string(), spacedString);

  it("normalizeText is deterministic", () => {
    fc.assert(
      fc.property(anyString, (s) => {
        expect(normalizeText(s)).toBe(normalizeText(s));
      }),
      { numRuns: 100 }
    );
  });

  it("normalizeText is idempotent", () => {
    fc.assert(
      fc.property(anyString, (s) => {
        const once = normalizeText(s);
        expect(normalizeText(once)).toBe(once);
      }),
      { numRuns: 100 }
    );
  });

  it("result has no leading/trailing whitespace and no consecutive whitespace runs", () => {
    fc.assert(
      fc.property(anyString, (s) => {
        const result = normalizeText(s);
        // No leading/trailing whitespace: trimming changes nothing.
        expect(result).toBe(result.trim());
        // No run of 2+ whitespace characters anywhere.
        expect(/\s{2,}/.test(result)).toBe(false);
        // Any remaining whitespace is a single ASCII space (collapsed form):
        // after removing single spaces, no other whitespace survives.
        expect(result.replace(/ /g, "")).not.toMatch(/\s/);
      }),
      { numRuns: 100 }
    );
  });
});
