import "./env.js";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { saveMessage } from "./db/messages.js";
import { isRoomMember } from "./db/membership.js";
import { findDisplayName } from "./db/users.js";
import { verifyAccessToken } from "./lib/tokens.js";

const PORT = 8001;

function readAccessToken(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined) {
    return undefined;
  }

  for (const part of cookieHeader.split("; ")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator);
    if (name === "accessToken") {
      return decodeURIComponent(part.slice(separator + 1));
    }
  }

  return undefined;
}

function onSocketPreError(e: Error) {
  console.log(e);
}

function onSocketPostError(e: Error) {
  console.log(e);
}

const server = createServer((_req, res) => {
  res.statusCode = 200;
  res.end("ok");
});

server.listen(PORT, () => {
  console.log(`WebSocket server is running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ noServer: true });

type Sender = {
  userId: string;
  displayName: string;
};

const rooms = new Map<string, Set<WebSocket>>();
const senders = new Map<WebSocket, Sender>();

server.on("upgrade", async (req, socket, head) => {
  socket.on("error", onSocketPreError);
  const url = new URL(req.url ?? "/", "http://localhost");
  const roomId = url.pathname.split("/")[2];

  if (
    roomId === undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roomId,
    )
  ) {
    socket.write("HTTP/1.1 404 Room not found\r\n\r\n");
    socket.destroy();
    return;
  }

  // auth
  const accessToken = readAccessToken(req.headers.cookie);
  if (accessToken === undefined) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const payload = verifyAccessToken(accessToken);
  if (payload === null) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  let allowed = false;
  try {
    allowed = await isRoomMember(payload.sub, roomId);
  } catch {
    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
    socket.destroy();
    return;
  }
  if (!allowed) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  let sender: string | null = null;
  try {
    sender = await findDisplayName(payload.sub);
  } catch {
    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
    socket.destroy();
    return;
  }
  if (sender === null) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  const displayName = sender;

  wss.handleUpgrade(req, socket, head, (ws) => {
    let members = rooms.get(roomId);
    if (members === undefined) {
      members = new Set();
      rooms.set(roomId, members);
    }
    members.add(ws);
    senders.set(ws, { userId: payload.sub, displayName });
    socket.removeListener("error", onSocketPreError);
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws, req) => {
  ws.on("error", onSocketPostError);
  const roomId = new URL(req.url ?? "/", "http://localhost").pathname.split(
    "/",
  )[2];
  const members = roomId === undefined ? undefined : rooms.get(roomId);

  if (roomId === undefined || members === undefined) {
    return;
  }

  ws.on("message", async (msg: WebSocket.RawData, isBinary: boolean) => {
    if (isBinary) {
      return;
    }

    const text = msg.toString().trim();
    if (text === "") {
      return;
    }

    const sender = senders.get(ws);
    if (sender === undefined) {
      return;
    }

    try {
      await saveMessage(roomId, sender.userId, text);
    } catch (error) {
      console.log(error);
      return;
    }

    const frame = JSON.stringify({
      sender: sender.displayName,
      text,
    });

    for (const client of members) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(frame);
      }
    }
  });

  ws.on("close", () => {
    members.delete(ws);
    senders.delete(ws);
    if (members.size === 0) {
      rooms.delete(roomId);
    }
  });
});
