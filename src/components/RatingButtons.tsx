"use client";

import type { RatingValue } from "@/lib/data";

/** Phone controller: upvote / neutral / downvote for the current video. */
export function RatingButtons({
  myRating,
  disabled,
  onRate,
}: {
  myRating: RatingValue | undefined;
  disabled?: boolean;
  onRate: (v: RatingValue) => void;
}) {
  const opts: { v: RatingValue; icon: string; label: string; cls: string }[] = [
    { v: 1, icon: "▲", label: "Upvote", cls: "rate-up" },
    { v: 0, icon: "•", label: "Neutral", cls: "rate-neutral" },
    { v: -1, icon: "▼", label: "Downvote", cls: "rate-down" },
  ];
  const locked = myRating !== undefined;

  return (
    <div className="rate-row">
      {opts.map((o) => {
        const active = myRating === o.v;
        return (
          <button
            key={o.v}
            className={`rate-btn ${o.cls}${active ? " active" : ""}`}
            disabled={disabled || locked}
            onClick={() => onRate(o.v)}
          >
            <span className="rate-icon">{o.icon}</span>
            <span className="rate-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
