"use client";

import { useData } from "@/lib/data";
import { Avatar } from "./Avatar";

/**
 * Upcoming night: the viewer's own guess at the BRoscar winner. Members only;
 * other members' picks stay hidden. Gone once the host starts the night.
 */
export function BroscarPrediction({ eventId }: { eventId: string }) {
  const data = useData();
  const event = data.getEvent(eventId);
  if (!event || event.status !== "upcoming") return null;
  const members = data.getMembers(event.groupId);
  if (!members.some((m) => m.id === data.currentUserId)) return null;

  const myPick = data.getMyPrediction(eventId, data.currentUserId);
  const picked = myPick ? data.getUser(myPick) : undefined;

  return (
    <div className="stack" style={{ gap: 8, marginTop: 8 }}>
      <div className="section-title">Who takes the BRoscar? 🔮</div>
      <div role="status" style={{ fontSize: 13, fontWeight: 600, color: picked ? "var(--gold)" : undefined }} className={picked ? "" : "muted"}>
        {picked ? `Your pick: ${picked.name}` : "Make your pick. Only you can see it until the night starts."}
      </div>
      <div className="row wrap" role="group" aria-label="Pick the BRoscar winner" style={{ gap: 8 }}>
        {members.map((u) => {
          const on = u.id === myPick;
          return (
            <button
              key={u.id}
              type="button"
              className="panel row"
              aria-pressed={on}
              aria-label={`Pick ${u.name}${u.id === data.currentUserId ? " (you)" : ""}`}
              onClick={() => data.predictBroscar(eventId, data.currentUserId, u.id)}
              style={{
                gap: 8,
                padding: "6px 12px 6px 6px",
                borderRadius: 999,
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
                borderColor: on ? "var(--gold)" : undefined,
                boxShadow: on ? "0 0 0 1px var(--gold)" : undefined,
              }}
            >
              <Avatar user={u} size={26} />
              <span style={{ fontSize: 13, fontWeight: on ? 700 : 400, color: on ? "var(--gold)" : undefined }}>
                {u.name}
                {on && " ✓"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
