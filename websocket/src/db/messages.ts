import { db } from "./index.js";
import { messages } from "./schema.js";

export async function saveMessage(
  roomId: string,
  senderId: string,
  content: string,
): Promise<void> {
  await db.insert(messages).values({ roomId, senderId, content });
}
