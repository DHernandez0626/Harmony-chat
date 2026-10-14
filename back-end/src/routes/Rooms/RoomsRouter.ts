import { Router, Request, Response } from "express";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../../db/index";
import { messages, roomUsers, rooms, users } from "../../db/schema";
import multer from "multer";
import chatRouter from "../Chat/ChatRouter";
import { findActiveUser, requireAdmin } from "../../middleware/requireAdmin";
import { isNonEmptyString } from "../../lib/validation";
import bcrypt from "bcryptjs";

const roomsRouter = Router();

const upload = multer();
roomsRouter.use("/:id", chatRouter);

roomsRouter.use(upload.none());

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function readQueryString(
  value: unknown,
): { ok: true; value?: string } | { ok: false } {
  if (value === undefined) {
    return { ok: true };
  }
  if (typeof value !== "string") {
    return { ok: false };
  }
  const trimmed = value.trim();
  return { ok: true, value: trimmed === "" ? undefined : trimmed };
}

roomsRouter.get("/", async (req: Request, res: Response) => {
  const search = readQueryString(req.query["search"]);
  const userCountQuery = readQueryString(req.query["userCount"]);
  const sort = readQueryString(req.query["sort"]);
  const order = readQueryString(req.query["order"]);
  const errors: {
    search?: string;
    userCount?: string;
    sort?: string;
    order?: string;
  } = {};

  if (!search.ok) {
    errors.search = "Search must be a single text value";
  }
  if (!userCountQuery.ok) {
    errors.userCount = "User count must be a single text value";
  }

  const userCount = userCountQuery.ok ? userCountQuery.value : undefined;
  if (userCount !== undefined && !/^\d+$/.test(userCount)) {
    errors.userCount = "User count must be a whole number";
  }
  if (
    sort.ok &&
    sort.value !== undefined &&
    sort.value !== "name" &&
    sort.value !== "userCount"
  ) {
    errors.sort = "Sort must be name or userCount";
  }
  if (!sort.ok) {
    errors.sort = "Sort must be a single text value";
  }
  if (
    order.ok &&
    order.value !== undefined &&
    order.value !== "asc" &&
    order.value !== "desc"
  ) {
    errors.order = "Order must be asc or desc";
  }
  if (!order.ok) {
    errors.order = "Order must be a single text value";
  }

  if (
    !search.ok ||
    !userCountQuery.ok ||
    !sort.ok ||
    !order.ok ||
    errors.userCount ||
    errors.sort ||
    errors.order
  ) {
    return res.status(400).json({ errors });
  }

  const roomQuery = db
    .select({
      id: rooms.id,
      name: rooms.name,
      hasPassword: rooms.hasPassword,
      createdAt: rooms.createdAt,
      usernames: sql<
        string[]
      >`coalesce(array_agg(${users.username} order by ${users.username}) filter (where ${users.username} is not null), '{}')`,
      userCount: sql<number>`count(${users.id})::int`,
    })
    .from(rooms)
    .leftJoin(roomUsers, eq(roomUsers.roomId, rooms.id))
    .leftJoin(users, eq(users.id, roomUsers.userId))
    .$dynamic();

  if (search.value) {
    roomQuery.where(ilike(rooms.name, `%${escapeLike(search.value)}%`));
  }

  roomQuery.groupBy(rooms.id, rooms.name, rooms.hasPassword, rooms.createdAt);

  if (userCount !== undefined) {
    roomQuery.having(sql`count(${users.id})::int = ${Number(userCount)}`);
  }

  const direction = order.value === "desc" ? desc : asc;

  roomQuery.orderBy(
    sort.value === "userCount"
      ? direction(sql`count(${users.id})`)
      : direction(rooms.name),
  );

  return res.json(await roomQuery);
});

roomsRouter.get("/:id/messages", async (req: Request, res: Response) => {
  const id = req.params["id"];
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return res.status(400).json({ errors: { id: "Room id must be a UUID" } });
  }

  const user = await findActiveUser(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.id, id))
    .limit(1);

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  const [membership] = await db
    .select({ userId: roomUsers.userId })
    .from(roomUsers)
    .where(and(eq(roomUsers.userId, user.id), eq(roomUsers.roomId, id)))
    .limit(1);

  if (!membership) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const rows = await db
    .select({
      name: users.name,
      username: users.username,
      content: messages.content,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.roomId, id))
    .orderBy(asc(messages.createdAt));

  return res.json(
    rows.map((row) => {
      const displayName = row.name?.trim();
      return {
        sender:
          displayName === undefined || displayName === ""
            ? row.username
            : displayName,
        text: row.content,
      };
    }),
  );
});

roomsRouter.get("/:id/members", async (req: Request, res: Response) => {
  const id = req.params["id"];
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return res.status(400).json({ errors: { id: "Room id must be a UUID" } });
  }

  const user = await findActiveUser(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.id, id))
    .limit(1);

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  const [membership] = await db
    .select({ userId: roomUsers.userId })
    .from(roomUsers)
    .where(and(eq(roomUsers.userId, user.id), eq(roomUsers.roomId, id)))
    .limit(1);

  if (!membership) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
    })
    .from(roomUsers)
    .innerJoin(users, eq(users.id, roomUsers.userId))
    .where(eq(roomUsers.roomId, id));

  const members = rows
    .map((row) => {
      const displayName = row.name?.trim();
      return {
        id: row.id,
        name:
          displayName === undefined || displayName === ""
            ? row.username
            : displayName,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return res.json(members);
});

roomsRouter.post("/:id", async (req: Request, res: Response) => {
  const id = req.params["id"];
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return res.status(400).json({ errors: { id: "Room id must be a UUID" } });
  }

  const user = await findActiveUser(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [room] = await db
    .select({
      id: rooms.id,
      password: rooms.password,
      hasPassword: rooms.hasPassword,
    })
    .from(rooms)
    .where(eq(rooms.id, id))
    .limit(1);

  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  if (room.hasPassword) {
    const password: unknown = req.body?.password;
    if (!isNonEmptyString(password)) {
      return res.status(400).json({
        errors: { password: "Password is required" },
      });
    }
    const passwordMatches = await bcrypt.compare(password, room.password ?? "");
    if (!passwordMatches) {
      return res.status(401).json({ message: "Incorrect password" });
    }
  }

  await db
    .insert(roomUsers)
    .values({ userId: user.id, roomId: room.id })
    .onConflictDoNothing();

  return res.json({ ok: true });
});

roomsRouter.delete("/", requireAdmin, async (req: Request, res: Response) => {
  const id: unknown = req.body?.id;
  if (!isNonEmptyString(id)) {
    return res.status(400).json({ errors: { id: "Room id is required" } });
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return res.status(400).json({ errors: { id: "Room id must be a UUID" } });
  }

  const [deleted] = await db
    .delete(rooms)
    .where(eq(rooms.id, id))
    .returning({ id: rooms.id });

  if (!deleted) {
    return res.status(404).json({ message: "Room not found" });
  }

  return res.status(204).send();
});

export default roomsRouter;
