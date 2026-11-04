import type { DeadlineKind, DeadlineStatus } from "@/lib/domain/deadline";

const DEADLINE_COLOR: Record<DeadlineKind, string | undefined> = {
  open: undefined,
  tomorrow: "var(--gold)",
  today: "var(--gold)",
  passed: "var(--danger)",
};

/** Inline deadline text, coloured by urgency. */
export function DeadlineLabel({ status }: { status: DeadlineStatus }) {
  return (
    <span style={{ color: DEADLINE_COLOR[status.kind], fontWeight: status.kind === "open" ? undefined : 600 }}>
      {status.label}
    </span>
  );
}
