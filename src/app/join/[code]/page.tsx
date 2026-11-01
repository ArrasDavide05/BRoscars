"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/lib/data";
import { AvatarStack } from "@/components/Avatar";
import { formatInviteCode } from "@/lib/domain/invite-code";
import { plural } from "@/lib/domain/format";

function decodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function JoinPage({ params }: { params: { code: string } }) {
  const data = useData();
  const router = useRouter();
  const code = decodeParam(params.code);
  const group = data.getGroupByInviteCode(code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <div className="panel pad stack" style={{ marginTop: 24, maxWidth: 480, gap: 14 }}>
        <span className="eyebrow">Invite</span>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>No group with that code</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          <span className="pill-code">{formatInviteCode(code)}</span> doesn&apos;t match any group. Check the link or ask
          the host for a new one.
        </p>
        <Link href="/" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>← Back home</Link>
      </div>
    );
  }

  const members = data.getMembers(group.id);
  // While a join is in flight the store already lists us as a member; keep the join view until we navigate.
  const alreadyMember = !busy && group.memberIds.includes(data.currentUserId);

  const join = async () => {
    setBusy(true);
    setError(null);
    const res = await data.joinGroupByCode(data.currentUserId, code);
    if (res.ok) {
      router.push(`/groups/${res.groupId}`);
      return;
    }
    setBusy(false);
    if (res.reason === "not-found") setError("No group with that code.");
  };

  return (
    <div className="panel pad stack" style={{ marginTop: 24, maxWidth: 480, gap: 14 }}>
      <span className="eyebrow">
        Invite <span className="pill-code">{formatInviteCode(group.inviteCode)}</span>
      </span>
      <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px" }}>{group.name}</h1>
      <div className="row" style={{ gap: 12 }}>
        <AvatarStack users={members} />
        <span className="muted" style={{ fontSize: 13 }}>{plural(members.length, "member")}</span>
      </div>

      {alreadyMember ? (
        <>
          <p className="muted" style={{ fontSize: 14 }}>You&apos;re already in {group.name}.</p>
          <Link href={`/groups/${group.id}`} className="btn btn-gold" style={{ alignSelf: "flex-start" }}>
            Go to group
          </Link>
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-gold"
            style={{ alignSelf: "flex-start" }}
            onClick={join}
            disabled={busy}
          >
            {busy ? "Joining…" : `Join as ${data.currentUser.name}`}
          </button>
          <p className="faint" style={{ fontSize: 12 }}>Not you? Switch &ldquo;Viewing as&rdquo; at the top.</p>
        </>
      )}
      <p role="status" aria-live="polite" className="muted" style={{ fontSize: 13 }}>{error}</p>
    </div>
  );
}
