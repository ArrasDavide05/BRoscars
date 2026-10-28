// Profile editor draft validation. Pure: no React/data imports.
// Normalises the display name (trim + collapse inner whitespace), enforces
// 1-40 chars, and says whether the draft differs from the saved profile.

export const PROFILE_NAME_MAX = 40;

export interface ProfileDraftInput {
  name: string;
  color: string;
  current: { name: string; avatarColor: string };
}

export interface ProfileDraftResult {
  ok: boolean;
  /** Normalised name, the value to save. */
  name: string;
  error?: string;
  /** True when the normalised name or the colour differs from `current`. */
  dirty: boolean;
}

export function normalizeProfileName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateProfileDraft({ name, color, current }: ProfileDraftInput): ProfileDraftResult {
  const normalized = normalizeProfileName(name);
  const dirty = normalized !== current.name || color !== current.avatarColor;
  let error: string | undefined;
  if (normalized.length === 0) error = "Name can't be blank.";
  else if (normalized.length > PROFILE_NAME_MAX) error = `Name must be at most ${PROFILE_NAME_MAX} characters.`;
  return error ? { ok: false, name: normalized, error, dirty } : { ok: true, name: normalized, dirty };
}
