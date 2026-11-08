// BRoscar acceptance speech validation. Pure: no React/data imports.
// Normalises the text (trim + collapse inner whitespace, so it stays one line)
// and enforces 1-140 chars.

export const SPEECH_MAX = 140;

export type SpeechResult = { ok: true; text: string } | { ok: false; error: string };

export function normalizeSpeech(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateSpeech(raw: string): SpeechResult {
  const text = normalizeSpeech(raw);
  if (text.length === 0) return { ok: false, error: "Your speech can't be blank." };
  if (text.length > SPEECH_MAX) return { ok: false, error: `Keep it to ${SPEECH_MAX} characters.` };
  return { ok: true, text };
}
