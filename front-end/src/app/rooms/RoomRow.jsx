"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function RoomRow({ room }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function join(event) {
    event.preventDefault();
    setError("");

    const response = await fetch(`http://localhost:8000/api/rooms/${room.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(room.hasPassword ? { password } : {}),
    });

    const body = await response.json().catch(() => ({}));

    if (response.status === 401 && body.message === "Unauthorized") {
      router.push("/login");
      return;
    }

    if (!response.ok) {
      setError(
        body.errors?.password ?? body.message ?? "Could not join this room",
      );
      return;
    }

    router.push(`/rooms/${room.id}`);
  }

  function openRow() {
    if (room.hasPassword) {
      setAsking(true);
      return;
    }
    join({ preventDefault() {} });
  }

  return (
    <div>
      <button
        type="button"
        onClick={openRow}
        className="grid w-full grid-cols-[1fr_6rem_3rem] text-left hover:bg-accent/10"
      >
        <span className="flex items-center px-4 py-3">{room.name}</span>
        <span className="flex items-center border-l border-line px-4 py-3">
          {room.userCount}
        </span>
        <span
          className="flex items-center border-l border-line px-4 py-3"
          aria-label={room.hasPassword ? "Password protected" : "Open room"}
        >
          {room.hasPassword ? <LockIcon /> : null}
        </span>
      </button>
      {asking ? (
        <form onSubmit={join} className="flex flex-col gap-2 px-4 pb-3">
          <label htmlFor={`password-${room.id}`} className="text-sm">
            Room password
          </label>
          <input
            id={`password-${room.id}`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-line bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
            autoFocus
          />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            className="w-fit rounded-md bg-accent px-3 py-2 text-sm text-accent-ink"
          >
            Join
          </button>
        </form>
      ) : null}
    </div>
  );
}
