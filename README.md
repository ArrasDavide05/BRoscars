# Oscar Night

A group video-challenge app for friends. Pick a prompt, everyone submits a video, reveal them Oscars-night style, vote, crown a winner.

## Project phase

**Currently: UI prototype only.** This repo is being built UI-first — a fully clickable, offline prototype with in-memory mock data, so the look and feel can be reviewed before any backend exists. See `CLAUDE.md` for the working rules and `SPEC.md` for the product definition.

The real v1 (Supabase + auth + storage + transcode) is planned in `.claude/plans/v1-plan.md` and will be built **after** the UI is approved, by swapping the internals of `src/lib/data/` — with no changes to the UI.

## Running the prototype

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables, no database, no internet required. The app loads pre-seeded with mock groups, rounds, submissions, and votes so every screen is populated.

Use the in-app "switch user" dev control to view the app as different group members.

## Structure (prototype phase)

- `src/app/` — Next.js screens
- `src/components/` — UI components
- `src/lib/data/` — **single data-access module** (mock now, Supabase later)
- `src/lib/domain/` — pure logic (shuffle, winner rules) reused in the real build

## Files to know

- `SPEC.md` — product spec and resolved decisions
- `CLAUDE.md` — persistent rules for Claude Code
- `.claude/plans/v1-plan.md` — the real v1 build plan (later phase)
