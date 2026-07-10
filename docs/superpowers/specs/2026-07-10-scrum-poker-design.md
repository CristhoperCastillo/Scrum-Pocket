# Scrum Poker — Design Spec

**Date**: 2026-07-10
**Status**: Approved design, pre-implementation

## Purpose

Web app for agile teams to estimate task effort using Planning Poker with Fibonacci cards. Users register/login, create or join estimation rooms via invite code, and vote on tasks in real time. Every round is persisted for later review.

## Goals

- User accounts: register, login, session via JWT + refresh token.
- Rooms created by a host, joined by others through a short invite code.
- Real-time voting: players pick a Fibonacci card; host reveals; average computed.
- Persistent history: each round (task, individual votes, average, final estimate) stored per room.
- Roles: host controls flow (start round, reveal, set final, next round); players vote.

## Non-Goals (YAGNI)

- Custom decks (schema allows future; only Fibonacci shipped).
- Spectator role.
- Team/organization management beyond rooms.
- Email verification, password reset (fase 2).
- OAuth / social login.

## Stack

- **Monorepo**: pnpm workspaces.
- **apps/api**: NestJS + Prisma + PostgreSQL. Socket.io gateway.
- **apps/web**: Next.js (App Router) + socket.io-client.
- **Auth**: JWT access token (15 min) + refresh token (7 d, httpOnly cookie).
- **Infra**: docker-compose for local Postgres.

## Architecture

```
scrum-poker/
  apps/
    api/                 NestJS
      src/
        auth/            register, login, refresh, JWT strategy, guards
        users/           user entity access
        rooms/           create room, join by code, room state, history REST
        game/            socket.io gateway + game service (rounds, votes)
        prisma/          PrismaService + module
      prisma/schema.prisma
    web/                 Next.js
      app/
        (auth)/login, (auth)/register
        dashboard/       list rooms, create, join
        room/[code]/     live poker table
      lib/               api client, socket client, auth context
  docker-compose.yml
  pnpm-workspace.yaml
```

## Data Model (Prisma)

```prisma
model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String
  name         String
  createdAt    DateTime     @default(now())
  memberships  RoomMember[]
  hostedRooms  Room[]       @relation("HostRooms")
  votes        Vote[]
}

model Room {
  id         String       @id @default(cuid())
  name       String
  inviteCode String       @unique          // short, e.g. 6 chars
  hostId     String
  host       User         @relation("HostRooms", fields: [hostId], references: [id])
  deck       String[]     @default(["1","2","3","5","8","13","21","34","55","89","?","☕"])
  status     RoomStatus   @default(ACTIVE)
  createdAt  DateTime     @default(now())
  members    RoomMember[]
  rounds     Round[]
}

model RoomMember {
  id       String     @id @default(cuid())
  roomId   String
  room     Room       @relation(fields: [roomId], references: [id], onDelete: Cascade)
  userId   String
  user     User       @relation(fields: [userId], references: [id])
  role     MemberRole @default(PLAYER)
  joinedAt DateTime   @default(now())
  @@unique([roomId, userId])
}

model Round {
  id            String      @id @default(cuid())
  roomId        String
  room          Room        @relation(fields: [roomId], references: [id], onDelete: Cascade)
  taskTitle     String
  status        RoundStatus @default(VOTING)
  finalEstimate String?
  avg           Float?
  createdAt     DateTime    @default(now())
  votes         Vote[]
}

model Vote {
  id        String   @id @default(cuid())
  roundId   String
  round     Round    @relation(fields: [roundId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  value     String
  createdAt DateTime @default(now())
  @@unique([roundId, userId])   // one vote per user per round (updatable)
}

enum RoomStatus { ACTIVE CLOSED }
enum MemberRole { HOST PLAYER }
enum RoundStatus { VOTING REVEALED }
```

## Deck

Fibonacci + specials: `1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕`.
Average computed over numeric cards only; `?` and `☕` excluded from `avg`.

## Auth Flow

- **Register** `POST /auth/register` — {email, name, password} → hash (bcrypt) → create user → issue tokens.
- **Login** `POST /auth/login` — verify → issue access token (body) + refresh token (httpOnly, secure, sameSite cookie).
- **Refresh** `POST /auth/refresh` — read refresh cookie → verify → new access token. Refresh token rotated.
- **Me** `GET /auth/me` — JWT guard → current user.
- Access token: 15 min, signed `JWT_ACCESS_SECRET`. Refresh: 7 d, signed `JWT_REFRESH_SECRET`.
- Passwords hashed with bcrypt (cost 12). Refresh token hash stored per user for rotation/revocation.

## REST Endpoints

| Method | Path | Auth | Body / Result |
|---|---|---|---|
| POST | `/auth/register` | no | {email,name,password} → {accessToken, user} + refresh cookie |
| POST | `/auth/login` | no | {email,password} → {accessToken, user} + refresh cookie |
| POST | `/auth/refresh` | cookie | → {accessToken} |
| POST | `/auth/logout` | JWT | clears refresh cookie + revokes |
| GET | `/auth/me` | JWT | → user |
| POST | `/rooms` | JWT | {name} → room (creator = HOST) |
| POST | `/rooms/join` | JWT | {inviteCode} → room (adds PLAYER) |
| GET | `/rooms/:id` | JWT (member) | room + members + current round |
| GET | `/rooms/:id/history` | JWT (member) | past rounds with votes + estimates |
| GET | `/rooms` | JWT | rooms user belongs to |

## WebSocket (socket.io)

- Namespace `/game`. Handshake auth: access token in `auth.token`; gateway verifies, attaches userId.
- Client joins socket room `room:{roomId}` on `join_room`.

**Client → server**:
| Event | Payload | Who | Effect |
|---|---|---|---|
| `join_room` | {roomId} | member | join socket room, receive `room_state` |
| `start_round` | {roomId, taskTitle} | host | create Round(VOTING), emit `round_started` |
| `cast_vote` | {roundId, value} | player | upsert Vote, emit `vote_cast` (userId only, not value) |
| `reveal` | {roundId} | host | set REVEALED, compute avg, emit `round_revealed` (all values) |
| `set_final` | {roundId, finalEstimate} | host | persist final, emit `round_finalized` |
| `next_round` | {roomId} | host | ready state for next start |

**Server → client**:
- `room_state` — members, roles, current round + who has voted.
- `round_started` — {roundId, taskTitle}.
- `vote_cast` — {userId} (reveals *that* a user voted, not the value).
- `round_revealed` — {roundId, votes:[{userId,value}], avg}.
- `round_finalized` — {roundId, finalEstimate}.
- `member_joined` / `member_left` — presence.
- `error` — {message}.

## Authorization Rules

- Only HOST may `start_round`, `reveal`, `set_final`, `next_round`.
- Only room members may `join_room`, `cast_vote`, read room/history.
- `cast_vote` allowed only while round `VOTING`.
- Vote values must be in room deck.

## Frontend Pages

- `/login`, `/register` — forms, store access token in memory + auth context; refresh cookie automatic.
- `/dashboard` — list my rooms, "create room" (name), "join room" (code). Shows invite code for hosted rooms.
- `/room/[code]` — live table: member avatars with voted/not-voted indicator, Fibonacci card hand, host controls (start round input, reveal, set final, next), revealed results + average, collapsible history panel.

## Error Handling

- REST: Nest exception filters → consistent `{statusCode, message}`. 401 unauth, 403 wrong role/not member, 404 room/round, 409 duplicate email / already member.
- WS: invalid action → `error` event, no state change. Host-only guard rejects non-host commands.
- Token expiry: web api-client intercepts 401 → calls `/auth/refresh` → retries once → else redirect `/login`.

## Testing

- **api unit**: game service (avg calc excludes `?`/`☕`, vote upsert, host guard), auth service (hash, token issue/verify).
- **api e2e** (Jest + supertest): register→login→refresh→me; create room→join by code→history.
- **web**: component smoke; full Playwright flow deferred to fase 2.

## Environment

`apps/api/.env`: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`.
`apps/web/.env`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`.

## Build Order (for plan)

1. Monorepo scaffold + docker-compose Postgres.
2. Prisma schema + migration.
3. api: auth module (register/login/refresh/me/logout + guards).
4. api: rooms module (create/join/get/history).
5. api: game gateway + service (rounds, votes, reveal).
6. web: auth pages + auth context + api client.
7. web: dashboard (create/join/list).
8. web: room live table + socket client.
9. Tests (unit + e2e).
