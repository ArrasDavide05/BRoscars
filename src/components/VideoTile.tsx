import type { Submission } from "@/lib/data";

/** Placeholder "video" — a gradient block with a play button. No real playback. */
export function VideoTile({
  submission,
  locked = false,
}: {
  submission: Submission;
  locked?: boolean;
}) {
  return (
    <div
      className="tile"
      style={{
        background: `linear-gradient(150deg, ${submission.tileFrom}, ${submission.tileTo})`,
      }}
    >
      {locked ? (
        <div className="tile-locked">
          <span style={{ fontSize: 22 }}>🔒</span>
          Sealed until reveal
        </div>
      ) : (
        <>
          <div className="tile-play" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="tile-dur">0:{String(submission.durationSec).padStart(2, "0")}</span>
        </>
      )}
    </div>
  );
}
