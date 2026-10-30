// Small display formatters shared by the phone recap / end-of-night cards.
// Pure: no React/data imports. Reused verbatim in the real build.

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 22 -> "22nd", 112 -> "112th". */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** Net score with an explicit plus sign: 3 -> "+3", 0 -> "0", -2 -> "-2". */
export const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** "1 crown", "0 crowns", "2 crowns". */
export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;
