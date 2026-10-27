"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { TrophyCabinet } from "@/components/TrophyCabinet";

const PALETTE = ["#E4B04A", "#6C8AE4", "#5FB98E", "#D06BA3", "#C96F5A", "#8E7CC3", "#4FB6C7", "#E0854A"];

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const data = useData();
  const user = data.getUser(params.userId);
  const isMe = params.userId === data.currentUserId;

  const [name, setName] = useState(user?.name ?? "");
  const [color, setColor] = useState(user?.avatarColor ?? PALETTE[0]);

  if (!user) {
    return <div className="pad"><p className="muted">Profile not found.</p></div>;
  }

  const stats = data.getCareerStats(user.id);
  const previewUser = { ...user, name: name || user.name, avatarColor: color };
  const dirty = name.trim() !== user.name || color !== user.avatarColor;

  return (
    <div className="stack" style={{ gap: 24, paddingTop: 24 }}>
      <Link href="/" className="faint" style={{ fontSize: 13 }}>← Home</Link>

      <div className="row" style={{ gap: 18 }}>
        <Avatar user={previewUser} size={82} />
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{isMe ? "Your profile" : "Member"}</span>
          <h1 style={{ fontSize: 34, fontWeight: 900 }}>{previewUser.name}</h1>
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
        <div className="panel pad stack" style={{ gap: 14 }}>
          <div className="section-title">Edit profile</div>
          <label className="stack" style={{ gap: 4 }}>
            <span className="faint" style={{ fontSize: 12 }}>Display name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </label>
          <div className="stack" style={{ gap: 8 }}>
            <span className="faint" style={{ fontSize: 12 }}>Avatar color</span>
            <div className="row wrap" style={{ gap: 10 }}>
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Pick ${c}`}
                  style={{
                    width: 34, height: 34, borderRadius: "50%", background: c, cursor: "pointer",
                    border: color === c ? "3px solid var(--text)" : "1px solid var(--line)",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="row">
            <button
              type="button"
              className="btn btn-gold"
              disabled={!dirty}
              onClick={() => data.updateProfile(user.id, { name, avatarColor: color })}
            >
              Save changes
            </button>
          </div>
        </div>
      ) : (
        <div className="note">
          Viewing {user.name}&apos;s profile. Switch to them with &ldquo;Viewing as&rdquo; to edit.
        </div>
      )}
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
