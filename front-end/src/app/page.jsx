import Link from "next/link";

const features = [
  {
    title: "Open or locked rooms",
    text: "Some rooms are open. Others stay locked until you know the password.",
  },
  {
    title: "Password checked first",
    text: "A locked room asks for its password, and the API decides if it is correct.",
  },
  {
    title: "Live messages",
    text: "Once you are in a room, messages show up as people send them.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-sm text-accent">Chat rooms</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-tight">Harmony</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        A chat app where you join rooms and talk live.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/rooms"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
        >
          Browse rooms
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:border-accent"
        >
          Create an account
        </Link>
        <Link href="/login" className="px-2 py-2 text-sm text-muted hover:text-foreground">
          Log in
        </Link>
      </div>
      <ul className="mt-14 grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <li
            key={feature.title}
            className="rounded-md border border-line border-t-accent bg-surface px-4 py-4"
          >
            <h2 className="font-medium">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted">{feature.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
