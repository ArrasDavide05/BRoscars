export function OscarBadge({ label = "BRoscar" }: { label?: string }) {
  return (
    <span className="oscar">
      <span aria-hidden>🏆</span>
      {label}
    </span>
  );
}
