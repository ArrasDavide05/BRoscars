# Oscar Night App — Product Spec (v2 Prototype)

> v2 supersedes v1's flat "group -> round" model. The app is now **group -> event -> round**, with a live Kahoot-style voting night. Sections 1-6 describe the product; Section 7 carries v1's resolved decisions that still hold; Section 8 records the v2 structural decisions.

## 1. Elevator Pitch

A group video-challenge app for friends. A group holds **events** ("nights"). For an event the host assembles ~6 **rounds**, each round themed by a prompt (e.g. "Best drunk video," "Funniest work video"). Everyone submits a matching video ahead of time. On the night, the host runs a live Oscars/Kahoot-style ceremony: each video is shown on a TV, everyone rates it from their phone (upvote / neutral / downvote), and each round crowns a winner. The member who wins the most rounds takes the event's overall **Broscar**.

## 2. Hierarchy (core model)

- **Theme** - a preset category (20 of them). Each theme owns ~3 **prompts**.
  - Example - Theme *Alcohol*: prompts "Best night out video," "Best drunk video," "Worst blackout."
  - Example - Theme *Work*: prompts "Funniest work video," "Best work edit," "Work incident."
- **Group** - friends who run events together over time (e.g. "Friday Night Crew").
- **Event** ("night") - a dated occasion inside a group. When creating it, the host picks the rounds by choosing **one prompt per theme** (~6 rounds per event).
- **Round** - one chosen prompt. Members submit one video each. Live voting crowns one round winner.
- **Submission** - one member's video for one round.
- **Broscar** - the event's overall champion: whoever won the most rounds. Tiebreak: most total upvotes across the event.

## 3. Core Loop

- Create or join a **group** via invite link/code.
- Host **creates an event**: picks ~6 rounds by selecting one prompt per theme, sets a submission deadline.
- Members **submit** one video per round ahead of the night. Before the event goes live, each member sees only their own submissions (sealed to others).
- Host **starts the live event** - launches the TV view. The night runs round by round.
- Per round, per video: the TV shows the video (with group name, date, prompt/theme, and who posted it); every member rates it from their phone **upvote / neutral / downvote**. Members cannot rate their own video.
- A video advances when **all present members have rated it OR a 30-second timer expires**, whichever comes first.
- After each round, the TV shows that round's **winner, 2nd, and 3rd** place (by net score = upvotes - downvotes).
- After all rounds, the TV crowns the **Broscar** champion for the event.

## 4. Voting & scoring

- Live rating per video: **upvote (+1) / neutral (0) / downvote (-1)**. One rating per member per video. No self-rating.
- **Round winner:** highest net score (upvotes - downvotes) for that round.
- **Broscar (event champion):** member who won the most rounds. Tie -> most total upvotes across the event.
- Ratings are hidden from members during the round; standings are revealed by the TV after each round.

## 5. Users & profile

- Display name and avatar are **editable** by the user (profile screen).
- **Career stats** shown on each profile:
  - **Crowns** - total individual round wins.
  - **Broscars** - total event championships won.
  - **Total upvotes** - lifetime upvotes received across all videos.

## 6. TV + Phone (live mode)

- **TV view** - the shared "host screen": group name, event date, current prompt/theme, the playing video, who posted it, and between rounds the standings/Broscar. Kahoot/Jackbox-style.
- **Phone view** - each member's controller: the three rating buttons for the current video, waiting states between videos, and "you can't rate your own entry."
- The two are synchronized. (In the real build this needs realtime infra; in the prototype it's faked with shared in-memory state - see CLAUDE.md.)

## 7. Carried-over v1 decisions (still in force)

- Auth: magic link (real build). Invite link/code group joining only.
- Video: 30s max; record in-app (MediaRecorder) or upload from camera roll; H.264 MP4 720p ~2-3 Mbps after a normalize/transcode step; client-side compression before upload.
- Stack: Next.js on Vercel + Supabase (Postgres/auth/storage). Domain logic kept framework-agnostic for later mobile reuse.
- Deferred earlier, now IN scope for v2: the live synchronous night (this was v1's biggest deferral).

## 8. v2 structural decisions

| Decision | Choice & rationale |
| --- | --- |
| Category vs. theme | "Category" = theme. Themes are a global preset library (20), each owning ~3 prompts. Not per-group. |
| Rounds assembled from prompts | Host builds an event by choosing one prompt per theme; each choice becomes a round. |
| Submission timing | **[ASSUMPTION]** Members submit to all of the event's rounds ahead of the live night; the night is the reveal+voting ceremony (prompts are NOT a live surprise). Override if prompts should be hidden until shown live. |
| Live rating | upvote / neutral / downvote; net score decides round; no self-rating. |
| Advance rule | All present rated OR 30s timer, whichever first. |
| Event champion | Broscar = most rounds won; tiebreak most total upvotes. |
| Round winner display | Top 3 shown after each round; Broscar after the event. |
| User editing | Name + avatar editable now; career stats (crowns, Broscars, total upvotes) shown on profile. |

## 9. Deferred to later versions

- Custom user-written prompts beyond the 20-theme preset library.
- Recurring event scheduling / reminders.
- Cross-group leaderboards.
- Real realtime TV<->phone transport (prototype fakes it in-memory).
