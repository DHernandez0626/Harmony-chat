import RoomRow from "./RoomRow";

export default async function Rooms() {
  let rooms = [];
  let failed = false;

  try {
    const response = await fetch("http://localhost:8000/api/rooms", {
      cache: "no-store",
    });
    if (!response.ok) {
      failed = true;
    } else {
      const body = await response.json();
      rooms = Array.isArray(body) ? body : [];
    }
  } catch {
    failed = true;
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-16">
      <p className="text-sm text-accent">Browse</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Rooms</h1>
      <p className="mt-3 text-sm text-muted">
        Join an open room, or enter the password for a locked one.
      </p>
      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="w-full max-w-xs">
          <label htmlFor="room-search" className="sr-only">
            Search rooms
          </label>
          <input
            id="room-search"
            type="search"
            placeholder="Search rooms"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
        </div>
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
        >
          Add room
        </button>
      </div>
      <div className="mt-3 overflow-hidden rounded-md border border-line bg-surface">
        <div className="grid grid-cols-[1fr_6rem_3rem] border-b border-line text-sm text-muted">
          <span className="px-4 py-2">Name</span>
          <span className="border-l border-line px-4 py-2">Users</span>
          <span className="border-l border-line px-4 py-2">
            <span className="sr-only">Password</span>
          </span>
        </div>
        {failed ? (
          <p className="px-4 py-6 text-sm text-muted">Could not load rooms.</p>
        ) : rooms.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No rooms yet.</p>
        ) : (
          <ul>
            {rooms.map((room) => (
              <li
                key={room.id}
                className="border-b border-line last:border-b-0"
              >
                <RoomRow room={room} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
