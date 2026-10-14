# back-end

Express API for the chat app. The database client is Drizzle, talking to PostgreSQL.

## Scripts

- `npm run dev` starts the server with `tsx watch`.
- `npm run db:generate` writes a SQL migration from `src/db/schema.ts`.
- `npm run db:migrate` applies pending migrations in `drizzle/`.

`DATABASE_URL` lives in `.env`.
