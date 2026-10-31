"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useData } from "@/lib/data";
import { inviteCodesMatch } from "@/lib/domain/invite-code";
import { plural } from "@/lib/domain/format";
import { AvatarStack } from "@/components/Avatar";

// Raw input cap is looser than the 40-char rule: validation trims/collapses first.
const GROUP_NAME_INPUT_MAX = 60;

export default function LandingPage() {
  const { currentUserId, getGroupsForUser, getMembers, getEvents } = useData();
  const groups = getGroupsForUser(currentUserId);

  return (
    <div className="stack" style={{ gap: 34, paddingTop: 40 }}>
      <section className="stack" style={{ gap: 18, maxWidth: 700 }}>
        <span className="eyebrow">The group video challenge</span>
        <h1 className="h-hero">
          Everyone films it.
          <br />
          One of you takes the <span style={{ color: "var(--gold)" }}>BRoscar</span>.
        </h1>
        <p className="muted" style={{ fontSize: 18, lineHeight: 1.5 }}>
          Your crew holds a <strong>night</strong>: ~6 themed rounds, everyone submits a clip,
          then a live Kahoot-style ceremony plays them on the TV while everyone rates from
          their phone. Win the most rounds and you&apos;re the champion.
        </p>
        <div className="row wrap" style={{ gap: 12 }}>
          {groups.length > 0 ? (
            <Link href={`/groups/${groups[0].id}`} className="btn btn-gold btn-lg">
              Enter your group →
            </Link>
          ) : (
            <a href="#group-forms" className="btn btn-gold btn-lg">
              Create or join a group ↓
            </a>
          )}
          <span className="note">Prototype · in-memory · offline · no login</span>
        </div>
      </section>

      <section className="stack">
        <div className="section-title">Your groups</div>
        {groups.length === 0 ? (
          <p className="muted">You&apos;re not in any group yet. Create one or join with a code below.</p>
        ) : (
          <div className="grid grid-2">
            {groups.map((g) => {
              const members = getMembers(g.id);
              const events = getEvents(g.id);
              const live = events.filter((e) => e.status === "live").length;
              const upcoming = events.filter((e) => e.status === "upcoming").length;
              return (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  className="panel pad cardlink"
                  style={{ display: "block" }}
                >
                  <div className="row between">
                    <h3 style={{ fontSize: 20 }}>{g.name}</h3>
                    <AvatarStack users={members.slice(0, 6)} />
                  </div>
                  <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
                    <span className="badge">{plural(members.length, "member")}</span>
                    <span className="badge">{events.length} events</span>
                    {live > 0 && <span className="badge revealed">● {live} live</span>}
                    {upcoming > 0 && <span className="badge open">{upcoming} upcoming</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="group-forms" className="grid grid-2" style={{ gap: 28 }}>
        <CreateGroupForm />
        <JoinGroupForm />
      </section>
    </div>
  );
}

function CreateGroupForm() {
  const { currentUserId, createGroup } = useData();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const id = await createGroup(currentUserId, name);
      router.push(`/groups/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the group.");
      setBusy(false);
    }
  };

  return (
    <form className="stack" style={{ gap: 10 }} onSubmit={submit} noValidate>
      <div className="section-title">Create a group</div>
      <label htmlFor="create-group-name" className="faint" style={{ fontSize: 12 }}>
        Group name
      </label>
      <input
        id="create-group-name"
        className="input"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(null); }}
        maxLength={GROUP_NAME_INPUT_MAX}
        placeholder="e.g. Taco Tuesday"
        aria-invalid={error ? true : undefined}
        aria-describedby="create-group-error"
      />
      <div id="create-group-error" role="alert" style={{ fontSize: 12, color: "var(--danger)", minHeight: 16 }}>
        {error}
      </div>
      <div className="row">
        <button type="submit" className="btn btn-gold" disabled={busy}>
          Create group
        </button>
      </div>
    </form>
  );
}

function JoinGroupForm() {
  const { currentUserId, joinGroupByCode, getGroupsForUser } = useData();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await joinGroupByCode(currentUserId, code);
    if (res.ok) {
      router.push(`/groups/${res.groupId}`);
      return;
    }
    setBusy(false);
    if (res.reason === "not-found") {
      setMessage("No group with that code.");
    } else {
      // Already a member: the group is one of ours, so name it.
      const group = getGroupsForUser(currentUserId).find((g) => inviteCodesMatch(code, g.inviteCode));
      setMessage(`You're already in ${group?.name ?? "that group"}.`);
    }
  };

  return (
    <form className="stack" style={{ gap: 10 }} onSubmit={submit} noValidate>
      <div className="section-title">Join with a code</div>
      <label htmlFor="join-group-code" className="faint" style={{ fontSize: 12 }}>
        Invite code
      </label>
      <input
        id="join-group-code"
        className="input pill-code"
        value={code}
        onChange={(e) => { setCode(e.target.value); setMessage(null); }}
        maxLength={20}
        placeholder="XXXX-XXXX"
        autoComplete="off"
        spellCheck={false}
        aria-describedby="join-group-result"
      />
      <div id="join-group-result" role="alert" style={{ fontSize: 12, color: "var(--danger)", minHeight: 16 }}>
        {message}
      </div>
      <div className="row">
        <button type="submit" className="btn btn-gold" disabled={busy || code.trim() === ""}>
          Join group
        </button>
      </div>
    </form>
  );
}
