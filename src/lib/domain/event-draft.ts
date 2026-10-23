// Pure validation for the host's event builder draft. No React/data imports.

export const EVENT_TITLE_MAX_LENGTH = 60;
export const RECOMMENDED_MIN_ROUNDS = 3;
export const RECOMMENDED_MAX_ROUNDS = 8;

export interface EventDraftInput {
  title: string;
  promptCount: number;
  /** Submission deadline, epoch ms. NaN when missing/invalid. */
  deadline: number;
  /** Current time, epoch ms. */
  now: number;
}

export interface EventDraftResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function validateEventDraft({ title, promptCount, deadline, now }: EventDraftInput): EventDraftResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const trimmed = title.trim();
  if (trimmed.length === 0) errors.push("Give the event a name");
  else if (trimmed.length > EVENT_TITLE_MAX_LENGTH)
    errors.push(`Event name must be ${EVENT_TITLE_MAX_LENGTH} characters or fewer`);

  if (promptCount <= 0) errors.push("Pick at least one prompt");
  else if (promptCount < RECOMMENDED_MIN_ROUNDS || promptCount > RECOMMENDED_MAX_ROUNDS)
    warnings.push("Aim for ~6 rounds");

  if (!Number.isFinite(deadline)) errors.push("Set a submission deadline");
  else if (deadline < startOfLocalDay(now)) errors.push("Deadline can't be in the past");

  return { ok: errors.length === 0, errors, warnings };
}

/** `YYYY-MM-DD` (from <input type="date">) -> end of that day in local time, epoch ms. NaN if invalid. */
export function deadlineFromDateInput(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const date = new Date(y, mo, d, 23, 59, 59, 999);
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return NaN;
  return date.getTime();
}

/** Epoch ms -> `YYYY-MM-DD` in local time, for <input type="date">. */
export function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
