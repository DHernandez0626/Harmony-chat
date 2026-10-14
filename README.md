# Harmony

Harmony is a chat application with accounts, public and password-protected rooms, saved message history, and live delivery. The browser, the HTTP API, and the realtime socket are separate programs. That split is the point of the project: each process has one job, and Docker runs the ones that share the database.

## What we did

- Password hashing and login with httpOnly cookies, so page JavaScript cannot read the token
- Room membership checked before someone can load history or open a socket
- A locked room password checked on the server before join
- History loaded over HTTP, then new messages appended over a WebSocket
- One Postgres database used by both the API and the socket process
- Docker Compose running Postgres, the API, and the websocket as separate containers

## Frontend

The site is a Next.js App Router app in `front-end`, written with React.

| Tool | Role in Harmony |
| --- | --- |
| [Next.js](https://nextjs.org/docs) | Routes for home, login, register, the room list, and a chat room. The room list is rendered on the server. Login, the navbar, and the chat screen run in the browser because they hold form state and an open socket. |
| [React](https://react.dev/) | The interface: room rows, the message list, and the member sidebar. |
| [Tailwind CSS](https://tailwindcss.com/docs) | The dark theme. Colors are shared tokens, so the pages use one palette. |
| [React Hook Form](https://react-hook-form.com/) | Login and register forms, including field errors. |
| [Zod](https://zod.dev/) | The login form's rules (required username and password) before the request is sent. The API checks the credentials again. |

The browser calls the API at `localhost:8000` with `credentials: "include"` so the login cookies are stored and sent back. Live messages use a WebSocket to `localhost:8001`.

## API

The API is a TypeScript [Express](https://expressjs.com/) app in `back-end`. It owns accounts, rooms, history, and the member list. It does not hold the open chat connections.

| Tool | Role in Harmony |
| --- | --- |
| [TypeScript](https://www.typescriptlang.org/docs/) | Types for users, sessions, rooms, and token payloads. |
| [Express](https://expressjs.com/) | HTTP routes under `/api/auth` and `/api/rooms`. |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | Signs and checks the access token (HS256). The payload is the user id, session id, and role. |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Hashes account passwords and locked-room passwords. Login and join compare the hash. The plaintext password is not stored. |
| [cookie-parser](https://github.com/expressjs/cookie-parser) | Reads the `accessToken` and `refreshToken` cookies on later requests. |
| [CORS](https://github.com/expressjs/cors) | Allows the Next app on port 3000 to call the API with cookies. |
| [Multer](https://github.com/expressjs/multer) | Parses form posts from the login, register, and join forms. |
| [Drizzle ORM](https://orm.drizzle.team/docs/overview) | Queries for users, sessions, rooms, membership, and messages. |
| [Drizzle Kit](https://orm.drizzle.team/docs/kit-overview) | Turns the schema into SQL migrations (`npm run db:migrate`) and can generate new ones. |
| [postgres.js](https://github.com/porsager/postgres) | The driver Drizzle uses to talk to Postgres. |
| [Swagger UI](https://swagger.io/tools/swagger-ui/) | Interactive API docs at `/api/docs`, generated from an OpenAPI description in the repo. |
| [dotenv](https://github.com/motdotla/dotenv) | Loads the database URL and JWT secret from the environment. |
| [tsx](https://tsx.is/) | Runs the TypeScript source directly, in development and in the API image. |

## Realtime

`websocket` is a second Node process. It uses the [`ws`](https://github.com/websockets/ws) library.

A connection is accepted only when the access-token cookie is valid and the user is already a member of that room. On each message the server saves a row, then broadcasts `{ sender, text }` to the sockets currently in the room. The socket process uses the same JWT secret and the same database as the API, so a token signed at login still verifies here.

## Data

[PostgreSQL](https://www.postgresql.org/docs/) stores users, sessions, rooms, room membership, and messages. Sample users and rooms come from `npm run db:seed`.

## Docker

[Docker Compose](https://docs.docker.com/compose/) starts three services from `compose.yaml`:

| Service | Image | Why it is separate |
| --- | --- | --- |
| `db` | `postgres:17` | The database. Data stays in a named volume when the containers stop. |
| `api` | Built from `back-end/Dockerfile` (`node:24`) | The HTTP API. |
| `websocket` | Built from `websocket/Dockerfile` (`node:24`) | The live chat process. |

The website is not in Compose. It runs on the host with `npm run dev` because the browser is already on the host. Published ports let the browser reach the API (`8000`), the socket (`8001`), and Postgres (`5434` on the host, `5432` inside the Docker network). Containers reach Postgres at the hostname `db`, not `localhost`.

`.env` is not copied into the images. Compose injects it when a container starts. The file is gitignored.
