# Oscar Night — v1 Build Plan

Status: **PLAN — not approved for implementation.** No code until explicitly instructed in a separate session.

Derived from SPEC.md Sections 1–7. Assumptions I made where Section 7 didn't fully specify an implementation detail are tagged **[ASSUMPTION]** — override on review.

---

## 0. Assumptions carried into this plan

- **[ASSUMPTION] Transcode = async worker.** Section 7 Q5 says "server-side normalization/transcode (e.g. edge function with ffmpeg)." Supabase Edge Functions run Deno and cannot easily bundle ffmpeg, and a 30s transcode inside a request will exceed serverless timeouts. Plan uses an **async normalize** step: client uploads raw to a `raw/` storage path → a Vercel Node function (with static ffmpeg) is invoked → writes normalized MP4 to `videos/` → flips `submissions.status` to `ready`. Adds a `status` column to `submissions`.
- **[ASSUMPTION] Winner stored on round.** To make lazy reveal idempotent and to render group history without recomputing votes, reveal writes `winner_user_ids uuid[]` onto `rounds`.
- **[ASSUMPTION] Prompts table.** Section 3 says "fixed curated prompt list." Modeled as a seeded `prompts` table (cheap, enables the deferred custom-prompt feature) rather than a hardcoded enum.
- **[ASSUMPTION] Vercel + Supabase; App Router; TypeScript; server actions preferred over API routes** except where a webhook/binary endpoint is required.

---

## 1. Project structure

```
oscar-night/
├── SPEC.md
├── .claude/plans/v1-plan.md
├── .env.local                      # Supabase URL, anon key, service-role key (server only)
├── next.config.mjs
├── middleware.ts                   # Supabase session refresh
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   └── 0003_seed_prompts.sql
│   └── functions/                  # (none required for v1 core; transcode lives in Vercel)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # landing / auth entry
│   │   ├── auth/callback/route.ts  # magic-link callback
│   │   ├── profile/page.tsx
│   │   ├── join/[code]/page.tsx    # invite-link landing
│   │   ├── groups/
│   │   │   ├── page.tsx            # my groups
│   │   │   ├── new/page.tsx
│   │   │   └── [groupId]/
│   │   │       ├── page.tsx        # group home: rounds list + history
│   │   │       └── rounds/
│   │   │           ├── new/page.tsx
│   │   │           └── [roundId]/page.tsx   # submit / reveal / vote / results
│   │   └── api/
│   │       └── transcode/route.ts  # POST webhook target; runs ffmpeg normalize
│   ├── actions/
│   │   ├── groups.ts               # createGroup, joinGroup
│   │   ├── rounds.ts               # createRound, revealRound
│   │   ├── submissions.ts          # createSubmission (metadata), finalizeUpload
│   │   └── votes.ts                # castVote
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # browser client
│   │   │   ├── server.ts           # server client (RSC/actions)
│   │   │   └── service.ts          # service-role client (transcode route only)
│   │   ├── domain/                 # framework-agnostic, reusable on mobile
│   │   │   ├── round-status.ts     # deriveStatus(deadline, forced, winner)
│   │   │   ├── shuffle.ts          # seededShuffle(items, seed) — user_id+round_id
│   │   │   ├── winner.ts           # computeWinners(votes, submissions)
│   │   │   └── invite-code.ts      # generate + collision policy
│   │   └── video/
│   │       └── compress-client.ts  # client-side pre-upload compression
│   └── components/
│       ├── VideoRecorder.tsx       # MediaRecorder capture
│       ├── VideoUploader.tsx       # camera-roll picker + client compress
│       ├── SubmissionCard.tsx
│       ├── RevealGrid.tsx          # shuffled reveal + vote UI
│       ├── ResultsPanel.tsx        # winner(s), Oscar
│       └── OscarBadge.tsx
└── tests/
    └── domain/                     # pure-logic unit tests (shuffle, winner, invite-code)
```

Rationale: all business logic lives in `src/lib/domain/` as pure functions with no Supabase/React imports, so the future React Native app reuses it verbatim (SPEC §5).

---

## 2. Database schema (Supabase migrations)

### `0001_init.sql`

```sql
-- Extensions
create extension if not exists "pgcrypto";

-- PROFILES (users are in auth.users; app-level profile here)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- PROMPTS (curated list; seeded)
create table prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- GROUPS
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- GROUP MEMBERS
create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ROUNDS
create type round_status as enum ('open', 'revealed', 'closed');

create table rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  prompt_id uuid references prompts(id),
  title text not null,                       -- denormalized prompt title (survives prompt edits)
  deadline timestamptz not null,
  status round_status not null default 'open',
  is_live boolean not null default false,    -- reserved for future live mode
  forced_reveal boolean not null default false,
  winner_user_ids uuid[] not null default '{}',
  revealed_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- SUBMISSIONS
create type submission_status as enum ('processing', 'ready', 'failed');

create table submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  raw_path text,                             -- storage path of pre-transcode upload
  video_url text,                            -- normalized playback URL (set when ready)
  status submission_status not null default 'processing',
  created_at timestamptz not null default now(),
  unique (round_id, user_id)                 -- one submission per person per round
);

-- VOTES
create table votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  submission_id uuid not null references submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (round_id, voter_id)                -- one vote per person per round
);

-- Prevent self-voting at the DB layer (defense in depth; also enforced in action)
create or replace function reject_self_vote() returns trigger as $$
begin
  if exists (
    select 1 from submissions s
    where s.id = new.submission_id and s.user_id = new.voter_id
  ) then
    raise exception 'cannot vote for own submission';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_reject_self_vote
  before insert on votes
  for each row execute function reject_self_vote();

-- Indexes
create index idx_rounds_group on rounds(group_id);
create index idx_submissions_round on submissions(round_id);
create index idx_votes_round on votes(round_id);
create index idx_group_members_user on group_members(user_id);
```

### `0002_rls.sql` (Row Level Security)

Policy summary (full SQL in migration):

- **profiles**: user can select any profile in a group they share; can insert/update only their own row.
- **groups**: member can select; anyone authenticated can select-by-invite-code path is handled via a `security definer` RPC `join_group(code)` rather than open select on `invite_code`.
- **group_members**: select if you're a member of that group; insert only via `join_group` RPC.
- **rounds**: select if member of the group; insert if member; update (reveal) only via `reveal_round` RPC (security definer) so status transitions are controlled.
- **submissions**: select if member of the round's group **and** (round is revealed **or** it's your own submission); insert only your own, only while round `open` and before deadline.
- **votes**: select only aggregate via RPC after reveal (individual votes never exposed to clients pre-reveal — keeps the envelope sealed); insert your own only after reveal, self-vote blocked by trigger.

**[RISK—see §3.5]** Votes must not be readable before reveal. Enforced by: no direct client select on `votes`; results come from a `security definer` `get_results(round_id)` RPC that returns only tallies and only when `status <> 'open'`.

### `0003_seed_prompts.sql`

```sql
insert into prompts (title) values
  ('Funniest work fail'),
  ('Best trick shot'),
  ('Most chaotic morning'),
  ('Worst cooking attempt'),
  ('Best pet cameo'),
  ('Most unnecessary purchase'),
  ('Weirdest thing in your fridge'),
  ('Best dad-joke delivery');
```

---

## 3. Implementation-risk flags + fixes

**3.1 Video storage / compression / transcode (SPEC §5, Q5).**
Risk: ffmpeg can't run in a Supabase Edge Function; synchronous transcode times out.
Fix: two-stage. (1) Client compresses before upload (`compress-client.ts`) to cut bandwidth. (2) Upload raw to `raw/{round}/{user}.webm`. (3) A Supabase Storage webhook (or explicit call from `finalizeUpload`) POSTs to `/api/transcode` (Vercel Node runtime, `maxDuration` raised, static ffmpeg via `ffmpeg-static`), which normalizes to H.264 MP4 720p ~2–3 Mbps, writes to `videos/`, sets `video_url` + `status='ready'`. Playback UI shows a "processing" state until `ready`. **[ASSUMPTION]** flagged in §0.

**3.2 Vote-uniqueness (SPEC §4).**
Risk: race between two concurrent votes from same user.
Fix: `unique (round_id, voter_id)` constraint (already in schema) — DB rejects the second insert; action catches the unique-violation and returns "already voted." Self-vote blocked by `trg_reject_self_vote` trigger **and** in the action.

**3.3 Invite-code collision.**
Risk: random code duplicates.
Fix: `invite-code.ts` generates an 8-char Crockford base32 code (unambiguous chars). Insert relies on `unique(invite_code)`; on unique violation, regenerate and retry up to 5 times. Collision probability is negligible but handled explicitly rather than assumed away.

**3.4 Lazy reveal idempotency + winner determination (Q6–Q11).**
Risk: multiple users opening a past-deadline round simultaneously each trigger reveal → double Oscar / race on `winner_user_ids`.
Fix: `reveal_round(round_id)` is a `security definer` RPC doing an atomic guarded update: `update rounds set status='revealed', revealed_at=now(), winner_user_ids=... where id=$1 and status='open'`. Only one transaction wins; others no-op. Winner computed inside the same transaction from vote tallies via `computeWinners`, applying: zero submissions → void (empty winners, status still flips), one submission → auto-win, ties → co-winners (array). **[NOTE]** Winners on reveal will be empty if reveal fires before any vote; since results aren't vote-gated (Q10), recompute winners on results read OR recompute at reveal only. Decision: **compute winners lazily in `get_results`** (not at reveal) so late votes still count; `winner_user_ids` is written the first time `get_results` runs after the round is revealed AND voting window rule is satisfied. → **Open question O1 below.**

**3.5 Vote secrecy (Q10).**
Risk: a client reading `votes` before reveal breaks suspense.
Fix: no client-side select on `votes` at all; tallies exposed only through `get_results` RPC gated on `status <> 'open'`. Covered in §2 RLS.

**3.6 Per-viewer shuffle stability (Q6).**
Risk: shuffle that reshuffles on every render.
Fix: `seededShuffle(items, seed)` where `seed = hash(user_id + round_id)` — deterministic, stable across reloads, differs per viewer. Pure function, unit-tested. No stored order column.

**3.7 Deadline / submission window.**
Risk: submission arriving after deadline but before lazy reveal.
Fix: RLS + action both reject `submissions` insert when `now() > deadline` or status `<> 'open'`.

---

## 4. Server actions & RPCs

| Name | Type | Guard |
|---|---|---|
| `createGroup(name)` | action | authed; generates invite code w/ retry |
| `join_group(code)` | RPC (definer) | authed; adds membership; returns group |
| `createRound(groupId, promptId, deadline)` | action | must be member |
| `reveal_round(roundId)` | RPC (definer) | member; force-close requires `created_by` |
| `createSubmission(roundId)` | action | member; round open; pre-deadline; returns signed upload URL for `raw/` |
| `finalizeUpload(submissionId, rawPath)` | action | owner; triggers transcode |
| `/api/transcode` | route (Node) | service-role; verifies webhook secret |
| `castVote(roundId, submissionId)` | action | member; revealed; not self; unique |
| `get_results(roundId)` | RPC (definer) | member; status<>open; returns tallies + winners |
| `updateProfile(name, avatar)` | action | owner |

---

## 5. Screens / components (dependency order within build)

1. Auth entry (`page.tsx`) + magic-link `auth/callback/route.ts` + `middleware.ts`.
2. Profile setup (`profile/page.tsx`) — name required post-first-login.
3. Groups list + create (`groups/`).
4. Join via invite (`join/[code]/page.tsx`).
5. Round create (`rounds/new`).
6. Submission: `VideoRecorder` / `VideoUploader` + client compress + upload + `/api/transcode`.
7. Reveal + vote: `RevealGrid` (seeded shuffle, name + prompt title, one vote, no self-vote).
8. Results: `ResultsPanel` + `OscarBadge` (co-winners, auto-win, void).
9. Group history on `groups/[groupId]/page.tsx`.

---

## 6. Dependency-ordered task list (small, independently testable)

- **T1 — Repo + Supabase init.** `next.config.mjs`, `supabase/config.toml`, `.env.local`, three Supabase clients in `src/lib/supabase/`. Test: app boots, session refresh works.
- **T2 — Migrations 0001–0003.** Apply schema, enums, trigger, indexes, seed. Test: `supabase db reset` succeeds; seed rows present.
- **T3 — RLS (0002).** Policies + `join_group`, `reveal_round`, `get_results` RPCs. Test: policy tests (member can/can't read votes; non-member can't read rounds).
- **T4 — Domain logic (pure).** `shuffle.ts`, `winner.ts`, `invite-code.ts`, `round-status.ts` + unit tests in `tests/domain/`. No DB. Test: full unit coverage incl. tie, void, one-submission, self-vote-exclusion, shuffle stability.
- **T5 — Auth + profile.** `page.tsx`, `auth/callback/route.ts`, `middleware.ts`, `profile/page.tsx`, `updateProfile`. Test: magic-link login → name capture.
- **T6 — Groups + invite.** `groups/`, `createGroup`, `join_group` wiring, `join/[code]`. Test: create → invite link → second user joins.
- **T7 — Rounds.** `rounds/new`, `createRound`, group home rounds list. Test: create round with prompt + deadline; appears open.
- **T8 — Submission upload (no transcode yet).** `createSubmission` signed URL, `VideoUploader`, `compress-client.ts`, raw upload, `finalizeUpload`. Test: upload lands in `raw/`; row `processing`.
- **T9 — Transcode.** `/api/transcode` with `ffmpeg-static`, storage webhook, `status→ready`, `video_url`. Test: raw webm/mp4 → normalized 720p mp4 plays back.
- **T10 — Recording.** `VideoRecorder` (MediaRecorder) feeding same upload path. Test: in-app record → same pipeline.
- **T11 — Reveal + vote.** Lazy reveal on round open past deadline via `reveal_round`; `RevealGrid` seeded shuffle; `castVote`. Test: past-deadline open flips status once; one vote; self-vote rejected.
- **T12 — Results.** `get_results`, `ResultsPanel`, `OscarBadge`; co-winner / auto-win / void paths. Test: tie → two Oscars; single submission → auto Oscar; zero → void.
- **T13 — Force-close.** Creator-only early reveal button. Test: non-creator blocked; creator flips before deadline.
- **T14 — Group history.** Past rounds + winners on group home; Oscar on profile. Test: completed round shows winner + prompt.

**V1 acceptance bar (Q14):** T1–T12 = one full round end-to-end. T13–T14 follow immediately, non-blocking.

---

## 7. Open questions for your review

- **O1 — Winner-write timing.** Since results aren't vote-gated (Q10) but reveal is lazy, should `winner_user_ids` be (a) computed once at first `get_results` after reveal and frozen, or (b) recomputed live until the round is manually `closed`? Late votes are possible under lazy reveal. My default: **(b) recompute in `get_results` while `revealed`; freeze on `closed`.** Confirm.
- **O2 — Who can force-close vs. who can create rounds?** Q8 says creator force-closes. Can any member create a round, or only the group creator? Spec §2 says "group creator starts a round" — I've restricted `createRound` to members generally; tighten to group creator only?
- **O3 — Avatar storage.** Optional avatar (Q2): store in same Supabase bucket under `avatars/`? Assuming yes.
- **O4 — Transcode trigger mechanism.** Storage webhook vs. explicit call from `finalizeUpload`. Webhook is cleaner but adds config; explicit call is simpler for a 2-person prototype. Default: **explicit call from `finalizeUpload`.** Confirm.

---

## 8. Explicitly deferred (SPEC §6)
Live/sync mode (`is_live` reserved), custom prompts (prompts table ready), recurring scheduling/reminders, cross-group leaderboards.

**END OF PLAN — awaiting review notes. No implementation.**
