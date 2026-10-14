import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { roomUsers } from "./schema.js";

export async function isRoomMember(
  userId: string,
  roomId: string,
): Promise<boolean> {
  const rows = await db
    .select({ userId: roomUsers.userId })
    .from(roomUsers)
    .where(and(eq(roomUsers.userId, userId), eq(roomUsers.roomId, roomId)))
    .limit(1);

  return rows.length === 1;
}
