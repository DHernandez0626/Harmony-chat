import { pgTable, primaryKey, serial, text, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull(),
  name: text("name"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomId: uuid("room_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  content: text("content").notNull(),
});

export const roomUsers = pgTable(
  "room_users",
  {
    userId: uuid("user_id").notNull(),
    roomId: uuid("room_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roomId] })],
);
