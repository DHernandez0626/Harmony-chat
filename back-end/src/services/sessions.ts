import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/index";
import { sessions, users } from "../db/schema";

class InactiveSessionError extends Error {
  constructor() {
    super("Session is no longer active");
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(user: { id: string }) {
  const refreshToken = randomBytes(32).toString("base64url");

  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
    })
    .returning({ id: sessions.id });

  if (!session) {
    throw new Error("Could not create the session");
  }

  return { refreshToken, sessionId: session.id };
}

export async function revokeSession(
  refreshToken: string,
  access: { sub: string; sid: string },
) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(refreshToken)))
    .limit(1);

  const matchesAccessToken =
    session !== undefined &&
    session.revokedAt === null &&
    session.expiresAt > new Date() &&
    session.userId === access.sub &&
    String(session.id) === access.sid;

  if (!session || !matchesAccessToken) {
    return false;
  }

  const [revoked] = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, session.id), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });

  return revoked !== undefined;
}

export async function rotateSession(refreshToken: string) {
  const [current] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(refreshToken)))
    .limit(1);

  if (
    !current ||
    current.revokedAt !== null ||
    current.expiresAt <= new Date()
  ) {
    return null;
  }

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, current.userId))
    .limit(1);

  if (!user) {
    return null;
  }

  try {
    return await db.transaction(async (tx) => {
      const nextRefreshToken = randomBytes(32).toString("base64url");
      const [nextSession] = await tx
        .insert(sessions)
        .values({
          userId: user.id,
          tokenHash: hashToken(nextRefreshToken),
        })
        .returning({ id: sessions.id });

      if (!nextSession) {
        throw new Error("Could not create the session");
      }

      const [revoked] = await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.id, current.id), isNull(sessions.revokedAt)))
        .returning({ id: sessions.id });

      if (!revoked) {
        throw new InactiveSessionError();
      }

      return {
        user,
        refreshToken: nextRefreshToken,
        sessionId: nextSession.id,
      };
    });
  } catch (error) {
    if (error instanceof InactiveSessionError) {
      return null;
    }
    throw error;
  }
}
