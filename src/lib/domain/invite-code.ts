// Pure invite-code helpers. No React/data imports.
// Crockford base32 (unambiguous: no I, L, O, U).

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Generates an 8-char invite code using the provided RNG (defaults to Math.random). */
export function generateInviteCode(rand: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  }
  return code;
}

/** Formats a code for display as XXXX-XXXX. */
export function formatInviteCode(code: string): string {
  const c = code.toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/**
 * Canonical form for comparing typed codes: trim, drop spaces/dashes, uppercase,
 * and map Crockford look-alikes (O->0, I->1, L->1).
 */
export function normalizeInviteCode(input: string): string {
  return input
    .trim()
    .replace(/[\s-]+/g, "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/** True when two codes are the same after normalizing both sides (blank never matches). */
export function inviteCodesMatch(a: string, b: string): boolean {
  const na = normalizeInviteCode(a);
  return na.length > 0 && na === normalizeInviteCode(b);
}

export const GROUP_NAME_MAX = 40;

/** Group name validation: trim + collapse inner whitespace, 1-40 chars. */
export function validateGroupName(raw: string): { name: string; error: string | null } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0) return { name, error: "Group name can't be blank." };
  if (name.length > GROUP_NAME_MAX) return { name, error: `Group name must be at most ${GROUP_NAME_MAX} characters.` };
  return { name, error: null };
}
