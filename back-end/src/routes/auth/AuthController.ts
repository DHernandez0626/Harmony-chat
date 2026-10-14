import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { users } from "../../db/schema";
import {
  clearAuthCookies,
  readAuthCookies,
  setAuthCookies,
} from "../../lib/cookies";
import { isNonEmptyString } from "../../lib/validation";
import { createJwtToken, verifyAccessToken } from "../../lib/tokens";
import { findActiveUser } from "../../middleware/requireAdmin";
import {
  createSession,
  revokeSession,
  rotateSession,
} from "../../services/sessions";
import bcrypt from "bcryptjs";
import multer from "multer";

const authRouter = Router();

const SALT_ROUNDS = 10;

const upload = multer();

authRouter.use(upload.none());

authRouter.post("/login", async (req: Request, res: Response) => {
  const username: unknown = req.body?.username;
  const password: unknown = req.body?.password;

  const errors: { username?: string; password?: string } = {};

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    if (!isNonEmptyString(username)) {
      errors.username = "Username is required";
    }
    if (!isNonEmptyString(password)) {
      errors.password = "Password is required";
    }
    return res.status(400).json({ errors });
  }

  const [existingUsername] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));

  const passwordMatches = existingUsername
    ? await bcrypt.compare(password, existingUsername.password)
    : false;

  if (!existingUsername || !passwordMatches) {
    return res.status(401).json({
      message: "Username does not exist or password is incorrect",
    });
  }

  const session = await createSession(existingUsername);
  const accessToken = createJwtToken(existingUsername, session.sessionId);

  setAuthCookies(res, accessToken, session.refreshToken);
  return res.json({ ok: true });
});

authRouter.post("/register", async (req: Request, res: Response) => {
  const email: unknown = req.body?.email;
  const username: unknown = req.body?.username;
  const password: unknown = req.body?.password;

  const errors: { email?: string; username?: string; password?: string } = {};

  if (
    !isNonEmptyString(email) ||
    !isNonEmptyString(username) ||
    !isNonEmptyString(password)
  ) {
    if (!isNonEmptyString(email)) {
      errors.email = "Email is required";
    }
    if (!isNonEmptyString(username)) {
      errors.username = "Username is required";
    }
    if (!isNonEmptyString(password)) {
      errors.password = "Password is required";
    }
    return res.status(400).json({ errors });
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  const [existingUsername] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username));

  if (existingEmail) {
    errors.email = "Email already registered";
  }
  if (existingUsername) {
    errors.username = "Username already registered";
  }

  if (errors.email || errors.username || errors.password) {
    return res.status(400).json({ errors });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      email,
      username,
      password: hashedPassword,
    })
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
    });

  if (!user) {
    return res.status(500).json({ message: "Could not create the account" });
  }

  return res.status(201).json({
    id: user.id,
    email: user.email,
    username: user.username,
  });
});

authRouter.get("/me", async (req: Request, res: Response) => {
  const activeUser = await findActiveUser(req);
  if (!activeUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [profile] = await db
    .select({ username: users.username, name: users.name })
    .from(users)
    .where(eq(users.id, activeUser.id))
    .limit(1);

  if (!profile) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({
    username: profile.username,
    name: profile.name,
  });
});

authRouter.post("/logout", async (req: Request, res: Response) => {
  const { refreshToken, accessToken } = readAuthCookies(req);

  const errors: { refreshToken?: string; accessToken?: string } = {};

  if (!isNonEmptyString(refreshToken) || !isNonEmptyString(accessToken)) {
    if (!isNonEmptyString(refreshToken)) {
      errors.refreshToken = "Refresh token is required";
    }
    if (!isNonEmptyString(accessToken)) {
      errors.accessToken = "Access token is required";
    }
    return res.status(400).json({ errors });
  }

  const payload = verifyAccessToken(accessToken);
  if (!payload) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const revoked = await revokeSession(refreshToken, payload);
  if (!revoked) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  clearAuthCookies(res);
  return res.json({ ok: true });
});

authRouter.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = readAuthCookies(req);

  if (!isNonEmptyString(refreshToken)) {
    return res.status(400).json({
      errors: { refreshToken: "Refresh token is required" },
    });
  }

  const rotated = await rotateSession(refreshToken);
  if (!rotated) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const accessToken = createJwtToken(rotated.user, rotated.sessionId);

  setAuthCookies(res, accessToken, rotated.refreshToken);
  return res.json({ ok: true });
});

export default authRouter;
