import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "user"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: roleEnum("role").notNull().default("user"),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '7 days'`),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  tokenHash: text("token_hash").notNull().unique(),
});

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    password: text("password"),
    hasPassword: boolean("has_password").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "rooms_has_password_matches_secret",
      sql`${table.hasPassword} = (${table.password} is not null)`,
    ),
  ],
);

export const roomUsers = pgTable(
  "room_users",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roomId] })],
);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  read: boolean("read").notNull().default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  roomUsers: many(roomUsers),
  messages: many(messages),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  roomUsers: many(roomUsers),
  messages: many(messages),
}));

export const roomUsersRelations = relations(roomUsers, ({ one }) => ({
  user: one(users, { fields: [roomUsers.userId], references: [users.id] }),
  room: one(rooms, { fields: [roomUsers.roomId], references: [rooms.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  room: one(rooms, { fields: [messages.roomId], references: [rooms.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));
