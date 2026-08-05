# BRoscars — Backlog

## Live reactions on the TV during playback (idea #1) — BACKLOGGED, do not build yet

**What:** While a video plays on the TV, phone taps stream emoji/reactions that float
across the shared screen in real time (Twitch/FB-Live style), plus a live "hype meter"
that fills as people react. The existing upvote / neutral / downvote rating still happens
at the end of the clip — this is additive, turning the ~30s of silent watching into a
participatory moment.

**Why:** The 30s of passive watching is the weakest point in the current live loop.
Jackbox/Kahoot show nobody should ever be idle; live reactions make watching the loudest
in-the-room moment and give the host a natural dramatic beat before revealing the vote.

**Complexity:** Medium. Fits the existing TV+phone live model. In the real build this rides
on Supabase Realtime broadcast channels (fire-and-forget, no persistence); the TV view
renders a lightweight animation layer. Main cost is animation polish and reaction-spam
rate-limiting.

**Status:** Parked. Depends on the Phase B realtime transport (Supabase Realtime replacing
the prototype's BroadcastChannel). Not started per owner decision.

---

Two more ideas from the readiness report (Section 6 of `REPORT.md`), not backlogged here:
"The Envelope" reveal + auto-superlatives (Low–Medium), and persistent group rivalries /
career narrative (Low).
