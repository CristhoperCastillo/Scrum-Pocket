# Scrum Poker

Planning Poker (Fibonacci) with real-time voting. Next.js + NestJS + Postgres.

Register / login, create a room, share its 6-char invite code, vote on tasks with
Fibonacci cards in real time, reveal + average, persist every round.

## Stack
- `apps/api` — NestJS 11 + Prisma 5 + PostgreSQL, REST auth/rooms + socket.io game gateway. JWT access (15 min) + rotating refresh cookie (7 d).
- `apps/web` — Next.js (App Router) + socket.io-client.

## Dev
1. `pnpm install`
2. `pnpm db:up`  (Postgres in Docker, host port **5433**)
3. `cd apps/api && pnpm prisma migrate dev && pnpm start:dev`  (API on :3001)
4. `cd apps/web && pnpm dev`  (web on :3000)
5. Open http://localhost:3000

## Env
- `apps/api/.env`: `DATABASE_URL` (postgresql://poker:poker@localhost:5433/poker), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `PORT`
- `apps/web/.env`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

> Postgres maps to host port **5433** (not the default 5432) to avoid a clash with another local container.

## Tests
```
cd apps/api
pnpm test       # unit  (auth service, game computeAvg) — 6 tests
pnpm test:e2e   # e2e   (auth flow, rooms create/join/history) — 5 tests
```

## Deck
`1 2 3 5 8 13 21 34 55 89 ? ☕` — average excludes `?` and `☕`.
