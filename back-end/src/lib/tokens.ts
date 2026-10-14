import jwt from "jsonwebtoken";
import "../env";

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  role: "user" | "admin";
};

function getJwtSecret() {
  const secret = process.env["JWT_SECRET_KEY"];
  if (!secret) {
    throw new Error("Auth is not configured");
  }
  return secret;
}

export function createJwtToken(
  user: { id: string; role: "user" | "admin" },
  sessionId: number,
) {
  return jwt.sign(
    { sub: user.id, role: user.role, sid: String(sessionId) },
    getJwtSecret(),
    { algorithm: "HS256", expiresIn: "15m" },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload === "string") {
      return null;
    }
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      return null;
    }
    if (payload.role !== "user" && payload.role !== "admin") {
      return null;
    }
    return { sub: payload.sub, sid: payload.sid, role: payload.role };
  } catch {
    return null;
  }
}
