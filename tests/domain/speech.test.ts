import { describe, it, expect } from "vitest";
import { SPEECH_MAX, validateSpeech } from "@/lib/domain/speech";

describe("validateSpeech", () => {
  it("rejects blank text", () => {
    expect(validateSpeech("")).toEqual({ ok: false, error: "Your speech can't be blank." });
  });

  it("rejects whitespace-only text", () => {
    expect(validateSpeech("  \n\t  ")).toEqual({ ok: false, error: "Your speech can't be blank." });
  });

  it("accepts exactly 140 characters", () => {
    const text = "a".repeat(SPEECH_MAX);
    expect(SPEECH_MAX).toBe(140);
    expect(validateSpeech(text)).toEqual({ ok: true, text });
  });

  it("rejects 141 characters", () => {
    expect(validateSpeech("a".repeat(SPEECH_MAX + 1))).toEqual({
      ok: false,
      error: "Keep it to 140 characters.",
    });
  });

  it("trims and collapses whitespace before checking length", () => {
    expect(validateSpeech("  I'd like to\n\nthank   my mum  ")).toEqual({
      ok: true,
      text: "I'd like to thank my mum",
    });
    expect(validateSpeech(`   ${"a".repeat(SPEECH_MAX)}   `).ok).toBe(true);
  });
});
