"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function linkClass(active) {
  return active
    ? "rounded-md px-3 py-2 text-sm text-accent"
    : "rounded-md px-3 py-2 text-sm text-muted hover:text-foreground";
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("http://localhost:8000/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then((body) => {
        if (active) {
          setUser(body);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch("http://localhost:8000/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    router.push("/");
  }

  const displayName = user?.name?.trim() || user?.username;
  const roomsActive = pathname.startsWith("/rooms");

  return (
    <nav className="border-b border-line">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-accent"
        >
          Harmony
        </Link>
        <ul className="flex items-center gap-1">
          <li>
            <Link href="/rooms" className={linkClass(roomsActive)}>
              Rooms
            </Link>
          </li>
          {ready && user ? (
            <>
              <li className="px-3 py-2 text-sm text-foreground">
                {displayName}
              </li>
              <li>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
                >
                  Log out
                </button>
              </li>
            </>
          ) : null}
          {ready && !user ? (
            <>
              <li>
                <Link
                  href="/login"
                  className={linkClass(pathname === "/login")}
                >
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className={linkClass(pathname === "/register")}
                >
                  Register
                </Link>
              </li>
            </>
          ) : null}
        </ul>
      </div>
    </nav>
  );
}
