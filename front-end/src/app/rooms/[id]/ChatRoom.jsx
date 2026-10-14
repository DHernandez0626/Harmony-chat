"use client";

import { useEffect, useState } from "react";

export default function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [draft, setDraft] = useState("");
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    let active = true;
    let ws = null;

    async function start() {
      let messagesResponse;
      let membersResponse;
      try {
        [messagesResponse, membersResponse] = await Promise.all([
          fetch(`http://localhost:8000/api/rooms/${roomId}/messages`, {
            credentials: "include",
          }),
          fetch(`http://localhost:8000/api/rooms/${roomId}/members`, {
            credentials: "include",
          }),
        ]);
      } catch {
        if (active) {
          setStatus("denied");
        }
        return;
      }
      if (!active) {
        return;
      }
      if (!messagesResponse.ok) {
        setStatus("denied");
        return;
      }

      const history = await messagesResponse.json();
      if (membersResponse.ok) {
        const people = await membersResponse.json();
        if (active && Array.isArray(people)) {
          setMembers(
            people.filter(
              (person) =>
                typeof person?.id === "string" &&
                typeof person?.name === "string",
            ),
          );
        }
      }
      if (!active) {
        return;
      }
      if (Array.isArray(history)) {
        setMessages(
          history.filter(
            (message) =>
              typeof message?.sender === "string" &&
              typeof message?.text === "string",
          ),
        );
      }

      ws = new WebSocket(`ws://localhost:8001/rooms/${roomId}`);

      ws.onopen = () => {
        if (active) {
          setStatus("open");
        }
      };

      ws.onmessage = (event) => {
        if (!active) {
          return;
        }
        let body;
        try {
          body = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (
          typeof body?.sender !== "string" ||
          typeof body?.text !== "string"
        ) {
          return;
        }
        setMessages((current) => [
          ...current,
          { sender: body.sender, text: body.text },
        ]);
      };

      ws.onclose = () => {
        if (!active) {
          return;
        }
        setStatus((current) => (current === "open" ? "closed" : "denied"));
      };

      if (active) {
        setSocket(ws);
      } else {
        ws.close();
      }
    }

    start();

    return () => {
      active = false;
      if (ws !== null) {
        ws.close();
      }
    };
  }, [roomId]);

  function sendMessage(event) {
    event.preventDefault();
    if (socket === null || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const text = draft.trim();
    if (text === "") {
      return;
    }
    socket.send(text);
    setDraft("");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-16">
      <section className="flex min-w-0 flex-1 flex-col">
        <p className="text-sm text-accent">Live</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Chat</h1>
        {status === "denied" ? (
          <p className="mt-3 text-sm text-muted">
            You are not in this room. Join it from the rooms list first.
          </p>
        ) : (
          <>
            <ul className="mt-8 flex flex-1 flex-col gap-2">
              {messages.map((message, index) => (
                <li
                  key={index}
                  className="rounded-md border border-line bg-surface px-3 py-2"
                >
                  <p className="text-sm text-accent">{message.sender}</p>
                  <p className="mt-1">{message.text}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={sendMessage} className="mt-4 flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
                placeholder="Message"
                disabled={status !== "open"}
              />
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-ink"
                disabled={status !== "open"}
              >
                Send
              </button>
            </form>
          </>
        )}
      </section>
      {status === "denied" ? null : (
        <aside className="w-52 shrink-0">
          <p className="text-sm text-accent">In this room</p>
          <ul className="mt-8 overflow-hidden rounded-md border border-line bg-surface">
            {members.map((member) => (
              <li
                key={member.id}
                className="border-b border-line px-3 py-2 text-sm last:border-b-0"
              >
                {member.name}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </main>
  );
}
