import "../env";
import bcrypt from "bcryptjs";
import { and, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { roomUsers, rooms, users } from "./schema";

const SALT_ROUNDS = 10;
const SEED_PASSWORD = "password";

const seedUsers = [
  { email: "ada@example.com", username: "ada", name: "Ada" },
  { email: "grace@example.com", username: "grace", name: "Grace" },
  { email: "linus@example.com", username: "linus", name: "Linus" },
  { email: "ken@example.com", username: "ken", name: "Ken" },
  { email: "barbara@example.com", username: "barbara", name: "Barbara" },
  { email: "alan@example.com", username: "alan", name: "Alan" },
];

const roomNames = ["General", "Random", "Help", "Project", "Off topic"];
const protectedRoomNames = ["Project", "Off topic"];

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const connection = postgres(databaseUrl);
const db = drizzle(connection);

function membersForRoom(roomIndex: number, userIds: string[]) {
  return [0, 1, 2].map(
    (offset) => userIds[(roomIndex * 2 + offset) % userIds.length]!,
  );
}

async function seed() {
  const password = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);

  await db
    .insert(users)
    .values(seedUsers.map((user) => ({ ...user, password })))
    .onConflictDoNothing({ target: users.email });

  const savedUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      inArray(
        users.email,
        seedUsers.map((user) => user.email),
      ),
    );

  const usersByEmail = new Map(savedUsers.map((user) => [user.email, user.id]));
  const userIds = seedUsers.map((user) => {
    const id = usersByEmail.get(user.email);
    if (!id) {
      throw new Error(`Missing seed user ${user.email}`);
    }
    return id;
  });

  const existingRooms = await db
    .select({ id: rooms.id, name: rooms.name })
    .from(rooms)
    .where(inArray(rooms.name, roomNames));

  const existingNames = new Set(existingRooms.map((room) => room.name));
  const missingNames = roomNames.filter((name) => !existingNames.has(name));

  const insertedRooms =
    missingNames.length === 0
      ? []
      : await db
          .insert(rooms)
          .values(
            missingNames.map((name) => ({
              name,
              password: protectedRoomNames.includes(name) ? password : null,
              hasPassword: protectedRoomNames.includes(name),
            })),
          )
          .returning({ id: rooms.id, name: rooms.name });

  const savedRooms = [...existingRooms, ...insertedRooms];
  const roomsByName = new Map(savedRooms.map((room) => [room.name, room.id]));

  const memberships = roomNames.flatMap((name, roomIndex) => {
    const roomId = roomsByName.get(name);
    if (!roomId) {
      throw new Error(`Missing seed room ${name}`);
    }
    return membersForRoom(roomIndex, userIds).map((userId) => ({
      userId,
      roomId,
    }));
  });

  await db
    .update(rooms)
    .set({ password, hasPassword: true })
    .where(
      and(inArray(rooms.name, protectedRoomNames), isNull(rooms.password)),
    );

  await db.insert(roomUsers).values(memberships).onConflictDoNothing();

  console.log(
    `Seeded ${savedUsers.length} users and ${savedRooms.length} rooms.`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await connection.end();
  });
