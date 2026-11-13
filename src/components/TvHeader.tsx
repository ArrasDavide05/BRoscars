export function TvHeader({
  groupName,
  event,
  label,
}: {
  groupName?: string;
  event: { title: string; date: number };
  label: string;
}) {
  return (
    <div className="tv-bar">
      <div className="row" style={{ gap: 10 }}>
        <span className="brand-mark">🏆</span>
        <div className="stack" style={{ gap: 2 }}>
          <strong>{groupName}</strong>
          <span className="faint" style={{ fontSize: 12 }}>
            {event.title} · {new Date(event.date).toLocaleDateString()}
          </span>
        </div>
      </div>
      <span className="badge revealed">{label}</span>
    </div>
  );
}
