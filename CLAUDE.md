# CLAUDE.md - Oscar Night

Persistent working rules for this repo. Read `SPEC.md` for what the app is (v2 model). This file governs how you build the prototype.

## Current phase: UI PROTOTYPE ONLY

We are building a **throwaway, UI-only prototype** to review look, feel, and flow. We are **NOT** building the real backend yet.

**DO NOT add in this phase:**
- Supabase, Postgres, or any database
- Auth (magic link, OAuth, real sessions)
- Real video upload, storage, or transcode
- Any network calls, websockets, or external services

Everything runs fully offline with `npm run dev`. All state lives in memory (React state/context). No persistence. Reloading resetting to seed is expected and fine.

## The v2 model (this is a structural change from v1)

The hierarchy is now **Theme -> Group -> Event -> Round -> Submission**, not the old flat group->round.

- **Theme**: global preset (20 total), each owns ~3 **prompts**. Example - Alcohol: "Best night out video", "Best drunk video", "Worst blackout". Work: "Funniest work video", "Best work edit", "Work incident".
- **Group**: friends (e.g. Friday Night Crew). Runs events over time.
- **Event** ("night"): dated occasion. Host assembles ~6 **rounds** by choosing ONE prompt per theme.
- **Round**: one chosen prompt; members submit one video each; live voting crowns one winner (highest net score).
- **Broscar**: event champion = most rounds won; tiebreak most total upvotes across the event.

Do NOT keep the old flat data shape. Restructure the data layer and domain logic to this hierarchy.

## The one architectural rule that must not be broken

**All data access goes through a single module: `src/lib/data/`.**
- Components/screens import data ONLY from there. Never inline mock data into a component.
- Its internals get swapped for Supabase later; the UI must not change when that happens.
- Pure logic lives in `src/lib/domain/` as pure functions, no React/data imports. Required domain functions:
  - `shuffle.ts` - per-viewer seeded order
  - `scoring.ts` - net score (upvotes - downvotes) per submission per round
  - `standings.ts` - round top-3 and Broscar (most rounds won, tiebreak total upvotes)
  - `invite-code.ts`
  These are reused verbatim in the real build.

## Behaviors to preserve (they affect how it feels)

- **Live rating is upvote / neutral / downvote**, one per member per video, NO self-rating (own card shows "your entry").
- **Round winner** = highest net score; show **top 3** after each round.
- **Broscar** = most rounds won (tiebreak total upvotes); shown after the event.
- **Advance rule**: a video advances when ALL present members have rated it OR a **30s timer** expires, whichever first. Show the timer on both TV and phone.
- **Pre-event privacy**: before the host starts the event, a member sees only their OWN submissions; others are sealed.
- **Ratings hidden during the round**; standings revealed by the TV between rounds.

## Live mode: TV + Phone (faked, not real realtime)

The live night is Kahoot/Jackbox-style. Build BOTH views as routes, synchronized via **shared in-memory state** (a single client-side store), so I can open them side by side in two browser tabs/windows and watch them move together. Do NOT use websockets/Supabase realtime - fake it in memory.
- **TV view** (e.g. `/events/[eventId]/tv`): group name, event date, current theme+prompt, playing video, who posted it, the 30s timer, and between-round standings + final Broscar.
- **Phone view** (e.g. `/events/[eventId]/play`): the three rating buttons for the current video, waiting/locked states, "can't rate your own entry."

## Structural UI changes requested (apply these)

1. **Group header is NOT a boxed rectangle** - render it on the same page background as everything else (no card/panel around the group name + members block). Keep group name; add a **"View group"** button that opens the member list with names.
2. **Events, not loose rounds**: the group home shows **events** (past + upcoming). An event expands to its ~6 rounds. Reproduce the "1 month ago, 6 rounds, each a theme, one winner each, one Broscar overall" structure.
3. **Event lifecycle**: pre-event (members submit, see only their own) -> host starts -> live TV+phone night -> results (round top-3s + Broscar) -> event goes to history.
4. **Event creation flow (host)**: pick ~6 rounds by choosing one prompt per theme from the 20-theme preset library; set deadline.
5. **Profile is editable** (name + avatar, in-memory) and shows **career stats**: crowns (round wins), Broscars (event wins), total upvotes.
6. Keep the existing dark/gold Oscars aesthetic and the "Viewing as" user switcher (it's how I test multiple members offline).

## Seed data (so every screen is populated offline)

Seed the "Friday Night Crew" group with:
- 6 members with names + avatar-initial placeholders; editable profiles with plausible career stats.
- One **past/closed event** (~1 month ago) with 6 rounds, each with a winner, plus a decided Broscar - so history + standings are visible.
- One **live-ready or in-progress event** so I can walk the TV + phone flow immediately (open TV in one tab, phone in another).
- One **pre-event** (upcoming) event where members are still submitting, showing the "see only your own" state.
- The 20-theme preset library with ~3 prompts each (real, usable examples).

## Working style

- Keep diffs small and focused. After each screen/feature, tell me what's now clickable so I can review incrementally.
- Prioritize the **live TV + phone night** and the **event/round/Broscar** structure - that's the heart of v2.
- Ask before deviating from these rules or SPEC.md.

## Later phases (do NOT start until I explicitly say so)

1. Swap `src/lib/data/` internals for local Supabase (Docker) - schema, RLS, auth, storage.
2. Real video upload + client compression + ffmpeg transcode.
3. Real realtime TV<->phone transport (Supabase realtime / channels).
4. Deploy to Vercel + hosted Supabase.
