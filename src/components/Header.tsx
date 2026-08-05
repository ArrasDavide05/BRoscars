"use client";

import Link from "next/link";
import { useData } from "@/lib/data";
import { Avatar } from "./Avatar";

/** Top bar with brand + the dev-only "logged in as" user switcher. */
export function Header() {
  const { users, currentUser, currentUserId, setCurrentUserId } = useData();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">🏆</span>
          <span className="brand-name">
            BR<span className="accent">oscars</span>
          </span>
        </Link>

        <div className="row" style={{ gap: 10 }}>
          <Link
            href={`/profile/${currentUserId}`}
            className="btn btn-ghost btn-sm"
            title="Your profile & career stats"
          >
            <Avatar user={currentUser} size={22} />
            <span style={{ marginLeft: 6 }}>Profile</span>
          </Link>
          <div className="devswitch" title="Dev-only: view the app as a different member">
            <label htmlFor="userswitch">Viewing as</label>
            <select
              id="userswitch"
              value={currentUserId}
              onChange={(e) => setCurrentUserId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
