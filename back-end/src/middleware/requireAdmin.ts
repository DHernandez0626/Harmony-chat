import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { sessions, users } from "../db/schema";
import { readAuthCookies } from "../lib/cookies";
import { verifyAccessToken } from "../lib/tokens";
import { isNonEmptyString } from "../lib/validation";

export async function findActiveUser(req: Request) {
  const { accessToken } = readAuthCookies(req);
  if (!isNonEmptyString(accessToken)) {
    return null;
  }

  const payload = verifyAccessToken(accessToken);
  const sessionId = Number(payload?.sid);
  if (!payload || !Number.isInteger(sessionId)) {
    return null;
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt <= new Date() ||
    session.userId !== payload.sub
  ) {
    return null;
  }

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  return user ?? null;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = await findActiveUser(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
}
