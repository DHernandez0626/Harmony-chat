import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { users } from "./schema.js";

export async function findDisplayName(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ username: users.username, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user === undefined) {
    return null;
  }

  const displayName = user.name?.trim();
  return displayName === undefined || displayName === ""
    ? user.username
    : displayName;
}
