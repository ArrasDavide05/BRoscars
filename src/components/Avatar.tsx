import type { User } from "@/lib/data";

export function Avatar({ user, size = 34 }: { user: User; size?: number }) {
  return (
    <span
      className="avatar"
      title={user.name}
      style={{
        width: size,
        height: size,
        background: user.avatarColor,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {user.initials}
    </span>
  );
}

export function AvatarStack({ users, size = 30 }: { users: User[]; size?: number }) {
  return (
    <span className="avatar-stack">
      {users.map((u) => (
        <Avatar key={u.id} user={u} size={size} />
      ))}
    </span>
  );
}
