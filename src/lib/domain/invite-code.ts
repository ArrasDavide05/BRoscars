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
