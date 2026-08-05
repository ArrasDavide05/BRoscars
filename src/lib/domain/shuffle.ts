// Pure, framework-agnostic. Reused as-is in the real build.
// Per-viewer reveal shuffle: seeded by current-user + round, stable across
// reloads, different per viewer. No stored order column.

/** Deterministic 32-bit string hash (FNV-1a). */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — small, fast, deterministic from a numeric seed. */
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a new array shuffled deterministically from `seed`.
 * Same seed + same items → same order, every time; different seed → different order.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashSeed(seed));
  const out = items.slice();
  // Fisher–Yates driven by the seeded PRNG.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Per-viewer seed (stable per viewer, differs between viewers) — for non-live grids. */
export function revealSeed(userId: string, roundId: string): string {
  return `${userId}:${roundId}`;
}

/**
 * Shared seed for the live TV play order: seeded by the round only, so every
 * tab (TV + phones) computes the same order and stays in lock-step.
 */
export function roundPlaySeed(roundId: string): string {
  return `round:${roundId}`;
}
