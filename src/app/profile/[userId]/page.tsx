"use client";

import Link from "next/link";
import { useState } from "react";
import { useData, type User } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { TrophyCabinet } from "@/components/TrophyCabinet";
import { PROFILE_NAME_MAX, validateProfileDraft } from "@/lib/domain/profile-draft";

const PALETTE = [
  { hex: "#E4B04A", label: "Gold" },
  { hex: "#6C8AE4", label: "Blue" },
  { hex: "#5FB98E", label: "Green" },
  { hex: "#D06BA3", label: "Pink" },
  { hex: "#C96F5A", label: "Terracotta" },
  { hex: "#8E7CC3", label: "Violet" },
  { hex: "#4FB6C7", label: "Teal" },
  { hex: "#E0854A", label: "Orange" },
];

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const data = useData();
  const user = data.getUser(params.userId);
  const isMe = params.userId === data.currentUserId;

  if (!user) {
    return <div className="pad"><p className="muted">Profile not found.</p></div>;
  }

  const stats = data.getCareerStats(user.id);

  return (
    <div className="stack" style={{ gap: 24, paddingTop: 24 }}>
      <Link href="/" className="faint" style={{ fontSize: 13 }}>← Home</Link>

      <div className="row" style={{ gap: 18 }}>
        <Avatar user={user} size={82} />
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{isMe ? "Your profile" : "Member"}</span>
          <h1 style={{ fontSize: 34, fontWeight: 900 }}>{user.name}</h1>
        </div>
      </div>

      {/* career stats */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <StatCard icon="👑" label="Crowns" value={stats.crowns} hint="round wins" />
        <StatCard icon="🏆" label="BRoscars" value={stats.broscars} hint="event wins" />
        <StatCard icon="▲" label="Upvotes" value={stats.upvotes} hint="lifetime" />
      </div>

      <TrophyCabinet userId={user.id} />

      {/* editor */}
      {isMe ? (
        <ProfileEditor key={user.id} user={user} />
      ) : (
        <div className="note">
          Viewing {user.name}&apos;s profile. Switch to them with &ldquo;Viewing as&rdquo; to edit.
        </div>
      )}
    </div>
  );
}

// Rendered with key={user.id}, so the draft resets whenever the profile's user changes.
function ProfileEditor({ user }: { user: User }) {
  const data = useData();
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(user.avatarColor);
  const [saved, setSaved] = useState(false);

  const draft = validateProfileDraft({ name, color, current: user });
  const previewUser = { ...user, name: draft.ok ? draft.name : user.name, avatarColor: color };

  const save = async () => {
    if (!draft.ok || !draft.dirty) return;
    await data.updateProfile(user.id, { name: draft.name, avatarColor: color });
    setName(draft.name);
    setSaved(true);
  };

  return (
    <div className="panel pad stack" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 12 }}>
        <Avatar user={previewUser} size={40} />
        <div className="section-title">Edit profile</div>
      </div>
      <label className="stack" style={{ gap: 4 }}>
        <span className="faint" style={{ fontSize: 12 }}>Display name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          maxLength={PROFILE_NAME_MAX}
          aria-invalid={!draft.ok}
          aria-describedby={draft.error ? "profile-name-error" : undefined}
        />
        {draft.error && (
          <span id="profile-name-error" style={{ fontSize: 12, color: "var(--danger)" }}>{draft.error}</span>
        )}
      </label>
      <div className="stack" style={{ gap: 8 }}>
        <span className="faint" style={{ fontSize: 12 }}>Avatar color</span>
        <div className="row wrap" style={{ gap: 10 }}>
          {PALETTE.map(({ hex, label }) => (
            <button
              type="button"
              key={hex}
              onClick={() => { setColor(hex); setSaved(false); }}
              aria-label={label}
              aria-pressed={color === hex}
              title={label}
              style={{
                width: 34, height: 34, borderRadius: "50%", background: hex, cursor: "pointer",
                border: color === hex ? "3px solid var(--text)" : "1px solid var(--line)",
              }}
            />
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <button type="button" className="btn btn-gold" disabled={!draft.ok || !draft.dirty} onClick={save}>
          Save changes
        </button>
        {/* live region stays mounted so screen readers announce the text change */}
        <span role="status" className="muted" style={{ fontSize: 13 }}>{saved ? "Saved ✓" : ""}</span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: string; label: string; value: number; hint: string }) {
  return (
    <div className="panel pad stack" style={{ gap: 4, alignItems: "center", textAlign: "center" }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 34, fontWeight: 900, color: "var(--gold-soft)" }}>{value}</div>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div className="faint" style={{ fontSize: 12 }}>{hint}</div>
    </div>
  );
}
