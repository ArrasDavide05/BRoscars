// Pure scoring. No React/data imports. Reused verbatim in the real build.
// Live rating per video: upvote (+1) / neutral (0) / downvote (-1).

export type RatingValue = -1 | 0 | 1;

export interface RatingLike {
  submissionId: string;
  value: RatingValue;
}

export interface SubmissionScore {
  up: number;
  down: number;
  neutral: number;
  /** net score = upvotes - downvotes */
  net: number;
}

/** Scores a single submission from the ratings cast on it. */
export function computeSubmissionScore(ratings: readonly RatingLike[]): SubmissionScore {
  let up = 0;
  let down = 0;
  let neutral = 0;
  for (const r of ratings) {
    if (r.value === 1) up += 1;
    else if (r.value === -1) down += 1;
    else neutral += 1;
  }
  return { up, down, neutral, net: up - down };
}

/** Scores every submission id, returning a map keyed by submissionId. */
export function scoreBySubmission(
  submissionIds: readonly string[],
  ratings: readonly RatingLike[]
): Record<string, SubmissionScore> {
  const byId: Record<string, RatingLike[]> = {};
  for (const id of submissionIds) byId[id] = [];
  for (const r of ratings) {
    if (r.submissionId in byId) byId[r.submissionId].push(r);
  }
  const out: Record<string, SubmissionScore> = {};
  for (const id of submissionIds) out[id] = computeSubmissionScore(byId[id]);
  return out;
}
