# Scrum Poker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Planning Poker web app where teams register, join rooms by invite code, and vote on task estimates with Fibonacci cards in real time, persisting every round.

**Architecture:** pnpm monorepo. `apps/api` = NestJS + Prisma + PostgreSQL exposing REST (auth, rooms) and a socket.io gateway (live game). `apps/web` = Next.js App Router consuming REST + socket.io. JWT access token (15 min) + rotating refresh token (7 d, httpOnly cookie).

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL 16, socket.io 4, Next.js 15 (App Router), React 19, TypeScript, Jest + supertest, bcrypt, pnpm.

## Global Constraints

- Package manager: **pnpm** only. Workspaces via `pnpm-workspace.yaml`.
- Node >= 20.
- TypeScript strict mode on in both apps.
- Deck (verbatim): `["1","2","3","5","8","13","21","34","55","89","?","☕"]`.
- Average excludes non-numeric cards (`?`, `☕`).
- All passwords hashed with bcrypt cost 12.
- Access token 15 min (`JWT_ACCESS_SECRET`); refresh token 7 d (`JWT_REFRESH_SECRET`), stored as hash on user, delivered as httpOnly+secure+sameSite=lax cookie named `refresh_token`.
- Roles: `HOST` | `PLAYER`. Host-only game commands enforced server-side.
- CORS: API allows `CORS_ORIGIN` with credentials.

---

## File Structure

```
scrum-poker/
  pnpm-workspace.yaml
  package.json
  docker-compose.yml
  .gitignore
  apps/
    api/
      package.json
      tsconfig.json
      nest-cli.json
      prisma/schema.prisma
      src/
        main.ts
        app.module.ts
        prisma/prisma.service.ts
        prisma/prisma.module.ts
        auth/auth.module.ts
        auth/auth.service.ts
        auth/auth.controller.ts
        auth/jwt.strategy.ts
        auth/jwt-auth.guard.ts
        auth/dto.ts
        users/users.service.ts
        users/users.module.ts
        rooms/rooms.module.ts
        rooms/rooms.service.ts
        rooms/rooms.controller.ts
        rooms/dto.ts
        game/game.module.ts
        game/game.service.ts
        game/game.gateway.ts
        game/ws-auth.ts
      test/
        auth.e2e-spec.ts
        rooms.e2e-spec.ts
      src/game/game.service.spec.ts
    web/
      package.json
      next.config.ts
      tsconfig.json
      app/
        layout.tsx
        page.tsx
        (auth)/login/page.tsx
        (auth)/register/page.tsx
        dashboard/page.tsx
        room/[code]/page.tsx
      lib/api.ts
      lib/socket.ts
      lib/auth-context.tsx
      lib/deck.ts
      components/Card.tsx
      components/MemberList.tsx
      components/HostControls.tsx
      components/HistoryPanel.tsx
```

---

## Task 1: Monorepo scaffold + Postgres

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `docker-compose.yml`, `.gitignore`

**Interfaces:**
- Produces: workspace with `apps/*`; local Postgres at `postgresql://poker:poker@localhost:5432/poker`.

- [ ] **Step 1: git init**

```bash
cd "scrum-poker" && git init
```

- [ ] **Step 2: Write root files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
```

`package.json`:
```json
{
  "name": "scrum-poker",
  "private": true,
  "scripts": {
    "db:up": "docker compose up -d",
    "db:down": "docker compose down"
  }
}
```

`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: poker
      POSTGRES_PASSWORD: poker
      POSTGRES_DB: poker
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`.gitignore`:
```
node_modules
dist
.next
.env
*.log
```

- [ ] **Step 3: Start DB and verify**

Run: `pnpm db:up && docker compose ps`
Expected: `db` service `running`, port 5432 mapped.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: monorepo scaffold + postgres compose"
```

---

## Task 2: API bootstrap + Prisma schema + migration

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/prisma/schema.prisma`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`, `apps/api/.env`

**Interfaces:**
- Produces: `PrismaService` (extends `PrismaClient`, `onModuleInit` connects); Nest app on port 3001 with CORS + cookie-parser; DB tables for User/Room/RoomMember/Round/Vote.

- [ ] **Step 1: Init API package**

```bash
cd apps/api
pnpm init
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt @prisma/client bcrypt cookie-parser reflect-metadata rxjs socket.io @nestjs/websockets @nestjs/platform-socket.io
pnpm add -D typescript ts-node @types/node @types/bcrypt @types/passport-jwt @types/cookie-parser @nestjs/cli @nestjs/testing jest ts-jest @types/jest supertest @types/supertest prisma
```

`apps/api/package.json` scripts block:
```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "prisma:migrate": "prisma migrate dev",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "esModuleInterop": true,
    "outDir": "./dist",
    "baseUrl": "./"
  }
}
```

`apps/api/nest-cli.json`:
```json
{ "collection": "@nestjs/schematics", "sourceRoot": "src" }
```

- [ ] **Step 2: Write Prisma schema**

`apps/api/prisma/schema.prisma`:
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id               String       @id @default(cuid())
  email            String       @unique
  passwordHash     String
  name             String
  refreshTokenHash String?
  createdAt        DateTime     @default(now())
  memberships      RoomMember[]
  hostedRooms      Room[]       @relation("HostRooms")
  votes            Vote[]
}

model Room {
  id         String       @id @default(cuid())
  name       String
  inviteCode String       @unique
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
  @@unique([roundId, userId])
}

enum RoomStatus { ACTIVE CLOSED }
enum MemberRole { HOST PLAYER }
enum RoundStatus { VOTING REVEALED }
```

`apps/api/.env`:
```
DATABASE_URL="postgresql://poker:poker@localhost:5432/poker"
JWT_ACCESS_SECRET="dev-access-secret-change-me"
JWT_REFRESH_SECRET="dev-refresh-secret-change-me"
CORS_ORIGIN="http://localhost:3000"
PORT=3001
```

- [ ] **Step 3: PrismaService + module**

`apps/api/src/prisma/prisma.service.ts`:
```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}
```

`apps/api/src/prisma/prisma.module.ts`:
```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

- [ ] **Step 4: main.ts + app.module.ts**

`apps/api/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
})
export class AppModule {}
```

`apps/api/src/main.ts`:
```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN, credentials: true });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

- [ ] **Step 5: Run migration**

Run: `cd apps/api && pnpm prisma migrate dev --name init`
Expected: migration applied, `prisma/migrations/*/migration.sql` created, tables exist.

- [ ] **Step 6: Boot check**

Run: `pnpm start:dev` (then Ctrl-C)
Expected: `Nest application successfully started` on port 3001, no errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(api): nest bootstrap + prisma schema + init migration"
```

---

## Task 3: Auth — service unit tests + implementation

**Files:**
- Create: `apps/api/src/users/users.service.ts`, `apps/api/src/users/users.module.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/dto.ts`, `apps/api/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces:
  - `UsersService.findByEmail(email): Promise<User|null>`, `.create({email,name,passwordHash}): Promise<User>`, `.setRefreshHash(userId, hash|null): Promise<void>`, `.findById(id)`.
  - `AuthService.register(dto): Promise<{accessToken, refreshToken, user}>`
  - `AuthService.login(dto): Promise<{accessToken, refreshToken, user}>`
  - `AuthService.refresh(userId, token): Promise<{accessToken}>`
  - `AuthService.logout(userId): Promise<void>`
  - Token payload shape `{ sub: userId, email }`.

- [ ] **Step 1: Write failing unit test**

`apps/api/src/auth/auth.service.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const users = new Map<string, any>();
const usersMock = {
  findByEmail: (e: string) => Promise.resolve([...users.values()].find(u => u.email === e) ?? null),
  findById: (id: string) => Promise.resolve(users.get(id) ?? null),
  create: (d: any) => { const u = { id: 'u1', refreshTokenHash: null, ...d }; users.set(u.id, u); return Promise.resolve(u); },
  setRefreshHash: (id: string, h: string | null) => { users.get(id).refreshTokenHash = h; return Promise.resolve(); },
};

describe('AuthService', () => {
  let svc: AuthService;
  beforeEach(async () => {
    users.clear();
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersMock },
        { provide: JwtService, useValue: new JwtService({ secret: 'test' }) },
      ],
    }).compile();
    svc = mod.get(AuthService);
    process.env.JWT_ACCESS_SECRET = 'a';
    process.env.JWT_REFRESH_SECRET = 'r';
  });

  it('registers and returns tokens', async () => {
    const res = await svc.register({ email: 'a@b.com', name: 'A', password: 'pw123456' });
    expect(res.accessToken).toBeDefined();
    expect(res.refreshToken).toBeDefined();
    expect(res.user.email).toBe('a@b.com');
  });

  it('rejects duplicate email', async () => {
    await svc.register({ email: 'a@b.com', name: 'A', password: 'pw123456' });
    await expect(svc.register({ email: 'a@b.com', name: 'A', password: 'pw123456' }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('login rejects bad password', async () => {
    await svc.register({ email: 'a@b.com', name: 'A', password: 'pw123456' });
    await expect(svc.login({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `cd apps/api && pnpm test auth.service`
Expected: FAIL — `Cannot find module './auth.service'`.

- [ ] **Step 3: Implement DTOs**

`apps/api/src/auth/dto.ts`:
```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(6) password: string;
}
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
```
(Add `pnpm add class-validator class-transformer` if not present.)

- [ ] **Step 4: Implement UsersService**

`apps/api/src/users/users.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  findByEmail(email: string) { return this.prisma.user.findUnique({ where: { email } }); }
  findById(id: string) { return this.prisma.user.findUnique({ where: { id } }); }
  create(data: { email: string; name: string; passwordHash: string }) {
    return this.prisma.user.create({ data });
  }
  async setRefreshHash(userId: string, refreshTokenHash: string | null) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });
  }
}
```

`apps/api/src/users/users.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({ providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
```

- [ ] **Step 5: Implement AuthService**

`apps/api/src/auth/auth.service.ts`:
```ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d',
    });
    await this.users.setRefreshHash(userId, await bcrypt.hash(refreshToken, 12));
    return { accessToken, refreshToken };
  }

  private strip(u: any) { return { id: u.id, email: u.email, name: u.name }; }

  async register(dto: RegisterDto) {
    if (await this.users.findByEmail(dto.email)) throw new ConflictException('Email already used');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create({ email: dto.email, name: dto.name, passwordHash });
    return { ...(await this.issueTokens(user.id, user.email)), user: this.strip(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Invalid credentials');
    return { ...(await this.issueTokens(user.id, user.email)), user: this.strip(user) };
  }

  async refresh(userId: string, token: string) {
    const user = await this.users.findById(userId);
    if (!user?.refreshTokenHash || !(await bcrypt.compare(token, user.refreshTokenHash)))
      throw new UnauthorizedException('Invalid refresh token');
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
    return { accessToken };
  }

  async logout(userId: string) { await this.users.setRefreshHash(userId, null); }
}
```

- [ ] **Step 6: Run — verify pass**

Run: `pnpm test auth.service`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(api): auth + users service with token issue/rotation"
```

---

## Task 4: Auth — JWT strategy, guard, controller, e2e

**Files:**
- Create: `apps/api/src/auth/jwt.strategy.ts`, `apps/api/src/auth/jwt-auth.guard.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.module.ts`, `apps/api/test/jest-e2e.json`, `apps/api/test/auth.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts` (import AuthModule, UsersModule)

**Interfaces:**
- Consumes: `AuthService`.
- Produces: routes `POST /auth/register|login|refresh|logout`, `GET /auth/me`. `req.user = { userId, email }` after `JwtAuthGuard`. Refresh cookie `refresh_token`.

- [ ] **Step 1: Write failing e2e test**

`apps/api/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

`apps/api/test/auth.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `t${Date.now()}@b.com`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('register -> login -> me', async () => {
    const reg = await request(app.getHttpServer())
      .post('/auth/register').send({ email, name: 'T', password: 'pw123456' }).expect(201);
    expect(reg.body.accessToken).toBeDefined();
    expect(reg.headers['set-cookie'][0]).toContain('refresh_token');

    const login = await request(app.getHttpServer())
      .post('/auth/login').send({ email, password: 'pw123456' }).expect(201);
    const token = login.body.accessToken;

    const me = await request(app.getHttpServer())
      .get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.email).toBe(email);
  });

  it('me without token -> 401', () =>
    request(app.getHttpServer()).get('/auth/me').expect(401));
});
```

- [ ] **Step 2: Run — verify fail**

Run: `cd apps/api && pnpm test:e2e auth`
Expected: FAIL — no `/auth/register` route (404).

- [ ] **Step 3: JWT strategy + guard**

`apps/api/src/auth/jwt.strategy.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }
  validate(payload: { sub: string; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

`apps/api/src/auth/jwt-auth.guard.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 4: Controller**

`apps/api/src/auth/auth.controller.ts`:
```ts
import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

const COOKIE = 'refresh_token';
const cookieOpts = {
  httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, path: '/auth', maxAge: 7 * 24 * 3600 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.register(dto);
    res.cookie(COOKIE, refreshToken, cookieOpts);
    return { accessToken, user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto);
    res.cookie(COOKIE, refreshToken, cookieOpts);
    return { accessToken, user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request) {
    const token = req.cookies?.[COOKIE];
    if (!token) throw new UnauthorizedException('No refresh token');
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_REFRESH_SECRET });
    } catch { throw new UnauthorizedException('Invalid refresh token'); }
    return this.auth.refresh(payload.sub, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.user.userId);
    res.clearCookie(COOKIE, { path: '/auth' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const u = await this.users.findById(req.user.userId);
    return { id: u!.id, email: u!.email, name: u!.name };
  }
}
```

- [ ] **Step 5: AuthModule + wire into AppModule**

`apps/api/src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

`apps/api/src/app.module.ts` (replace):
```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, UsersModule, AuthModule],
})
export class AppModule {}
```

- [ ] **Step 6: Run — verify pass**

Run: `pnpm test:e2e auth`
Expected: PASS (2 tests). DB must be up.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(api): auth controller, jwt strategy/guard, e2e"
```

---

## Task 5: Rooms module + e2e

**Files:**
- Create: `apps/api/src/rooms/rooms.service.ts`, `apps/api/src/rooms/rooms.controller.ts`, `apps/api/src/rooms/rooms.module.ts`, `apps/api/src/rooms/dto.ts`, `apps/api/test/rooms.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts` (import RoomsModule)

**Interfaces:**
- Consumes: `PrismaService`, `JwtAuthGuard`.
- Produces:
  - `RoomsService.create(userId, name): Promise<Room>` (creator RoomMember HOST, unique 6-char inviteCode).
  - `.join(userId, inviteCode): Promise<Room>` (adds PLAYER; idempotent if member).
  - `.getForUser(userId): Promise<Room[]>`; `.getRoom(userId, roomId)` (403 if not member) returns room+members+active round; `.history(userId, roomId)` returns rounds+votes desc.
  - `.assertMember(userId, roomId): Promise<MemberRole>` reused by gateway.
  - Routes `POST /rooms`, `POST /rooms/join`, `GET /rooms`, `GET /rooms/:id`, `GET /rooms/:id/history`.

- [ ] **Step 1: Write failing e2e**

`apps/api/test/rooms.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rooms (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  let hostToken: string; let playerToken: string; let inviteCode: string;
  const hostEmail = `h${Date.now()}@b.com`;
  const playerEmail = `p${Date.now()}@b.com`;

  const reg = (email: string) => request(app.getHttpServer())
    .post('/auth/register').send({ email, name: 'X', password: 'pw123456' });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
    hostToken = (await reg(hostEmail)).body.accessToken;
    playerToken = (await reg(playerEmail)).body.accessToken;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [hostEmail, playerEmail] } } });
    await app.close();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  it('host creates room', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms').set(auth(hostToken)).send({ name: 'Sprint 1' }).expect(201);
    expect(res.body.inviteCode).toHaveLength(6);
    inviteCode = res.body.inviteCode;
  });

  it('player joins by code', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms/join').set(auth(playerToken)).send({ inviteCode }).expect(201);
    expect(res.body.name).toBe('Sprint 1');
  });

  it('non-member forbidden from history', async () => {
    const other = (await reg(`o${Date.now()}@b.com`)).body.accessToken;
    const room = (await request(app.getHttpServer()).post('/rooms').set(auth(hostToken)).send({ name: 'Priv' })).body;
    await request(app.getHttpServer())
      .get(`/rooms/${room.id}/history`).set(auth(other)).expect(403);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `pnpm test:e2e rooms`
Expected: FAIL — `/rooms` 404.

- [ ] **Step 3: DTOs**

`apps/api/src/rooms/dto.ts`:
```ts
import { IsString, MinLength, Length } from 'class-validator';
export class CreateRoomDto { @IsString() @MinLength(1) name: string; }
export class JoinRoomDto { @IsString() @Length(6, 6) inviteCode: string; }
```

- [ ] **Step 4: RoomsService**

`apps/api/src/rooms/rooms.service.ts`:
```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, name: string) {
    let inviteCode = genCode();
    while (await this.prisma.room.findUnique({ where: { inviteCode } })) inviteCode = genCode();
    return this.prisma.room.create({
      data: {
        name, inviteCode, hostId: userId,
        members: { create: { userId, role: MemberRole.HOST } },
      },
    });
  }

  async join(userId: string, inviteCode: string) {
    const room = await this.prisma.room.findUnique({ where: { inviteCode } });
    if (!room) throw new NotFoundException('Room not found');
    await this.prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: {},
      create: { roomId: room.id, userId, role: MemberRole.PLAYER },
    });
    return room;
  }

  getForUser(userId: string) {
    return this.prisma.room.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assertMember(userId: string, roomId: string): Promise<MemberRole> {
    const m = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!m) throw new ForbiddenException('Not a room member');
    return m.role;
  }

  async getRoom(userId: string, roomId: string) {
    await this.assertMember(userId, roomId);
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        rounds: { where: { status: 'VOTING' }, take: 1, orderBy: { createdAt: 'desc' },
          include: { votes: { select: { userId: true } } } },
      },
    });
  }

  async history(userId: string, roomId: string) {
    await this.assertMember(userId, roomId);
    return this.prisma.round.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: { votes: { include: { user: { select: { id: true, name: true } } } } },
    });
  }
}
```

- [ ] **Step 5: Controller + module + wire**

`apps/api/src/rooms/rooms.controller.ts`:
```ts
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, JoinRoomDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private rooms: RoomsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateRoomDto) {
    return this.rooms.create(req.user.userId, dto.name);
  }
  @Post('join')
  join(@Req() req: any, @Body() dto: JoinRoomDto) {
    return this.rooms.join(req.user.userId, dto.inviteCode);
  }
  @Get()
  list(@Req() req: any) { return this.rooms.getForUser(req.user.userId); }
  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) { return this.rooms.getRoom(req.user.userId, id); }
  @Get(':id/history')
  history(@Req() req: any, @Param('id') id: string) { return this.rooms.history(req.user.userId, id); }
}
```

`apps/api/src/rooms/rooms.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';

@Module({ providers: [RoomsService], controllers: [RoomsController], exports: [RoomsService] })
export class RoomsModule {}
```

Add `RoomsModule` to `AppModule` imports.

- [ ] **Step 6: Run — verify pass**

Run: `pnpm test:e2e rooms`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(api): rooms module (create/join/get/history) + e2e"
```

---

## Task 6: Game service — round/vote/reveal logic (unit)

**Files:**
- Create: `apps/api/src/game/game.service.ts`, `apps/api/src/game/game.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `RoomsService`.
- Produces:
  - `GameService.startRound(userId, roomId, taskTitle): Promise<Round>` (host-only, one active VOTING at a time — closes prior).
  - `.castVote(userId, roundId, value): Promise<void>` (member of round's room, round VOTING, value in deck; upsert).
  - `.reveal(userId, roundId): Promise<{votes, avg}>` (host-only → status REVEALED, avg over numeric).
  - `.setFinal(userId, roundId, finalEstimate): Promise<Round>` (host-only).
  - Static `computeAvg(values: string[]): number | null` — numeric only, null if none.

- [ ] **Step 1: Write failing unit test (pure avg logic)**

`apps/api/src/game/game.service.spec.ts`:
```ts
import { GameService } from './game.service';

describe('GameService.computeAvg', () => {
  it('averages numeric cards', () => {
    expect(GameService.computeAvg(['1', '3', '8'])).toBe(4);
  });
  it('excludes ? and coffee', () => {
    expect(GameService.computeAvg(['5', '?', '☕', '5'])).toBe(5);
  });
  it('null when no numeric votes', () => {
    expect(GameService.computeAvg(['?', '☕'])).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `pnpm test game.service`
Expected: FAIL — no module.

- [ ] **Step 3: Implement GameService**

`apps/api/src/game/game.service.ts`:
```ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService, private rooms: RoomsService) {}

  static computeAvg(values: string[]): number | null {
    const nums = values.map(Number).filter((n) => !Number.isNaN(n));
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  private async assertHost(userId: string, roomId: string) {
    const role = await this.rooms.assertMember(userId, roomId);
    if (role !== MemberRole.HOST) throw new ForbiddenException('Host only');
  }

  async startRound(userId: string, roomId: string, taskTitle: string) {
    await this.assertHost(userId, roomId);
    await this.prisma.round.updateMany({
      where: { roomId, status: 'VOTING' }, data: { status: 'REVEALED' },
    });
    return this.prisma.round.create({ data: { roomId, taskTitle } });
  }

  async castVote(userId: string, roundId: string, value: string) {
    const round = await this.prisma.round.findUnique({ where: { id: roundId }, include: { room: true } });
    if (!round) throw new NotFoundException('Round not found');
    await this.rooms.assertMember(userId, round.roomId);
    if (round.status !== 'VOTING') throw new BadRequestException('Round not open');
    if (!round.room.deck.includes(value)) throw new BadRequestException('Invalid card');
    await this.prisma.vote.upsert({
      where: { roundId_userId: { roundId, userId } },
      update: { value },
      create: { roundId, userId, value },
    });
  }

  async reveal(userId: string, roundId: string) {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException('Round not found');
    await this.assertHost(userId, round.roomId);
    const votes = await this.prisma.vote.findMany({
      where: { roundId }, include: { user: { select: { id: true, name: true } } },
    });
    const avg = GameService.computeAvg(votes.map((v) => v.value));
    await this.prisma.round.update({ where: { id: roundId }, data: { status: 'REVEALED', avg } });
    return { votes, avg };
  }

  async setFinal(userId: string, roundId: string, finalEstimate: string) {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException('Round not found');
    await this.assertHost(userId, round.roomId);
    return this.prisma.round.update({ where: { id: roundId }, data: { finalEstimate } });
  }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `pnpm test game.service`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): game service (rounds/votes/reveal) + avg unit tests"
```

---

## Task 7: Game gateway (socket.io)

**Files:**
- Create: `apps/api/src/game/ws-auth.ts`, `apps/api/src/game/game.gateway.ts`, `apps/api/src/game/game.module.ts`
- Modify: `apps/api/src/app.module.ts` (import GameModule)

**Interfaces:**
- Consumes: `GameService`, `RoomsService`, `JwtService`.
- Produces: socket.io namespace `/game`. Handshake `auth.token` (access JWT) → `socket.data.userId`. Events per spec (`join_room`, `start_round`, `cast_vote`, `reveal`, `set_final`, `next_round`; emits `room_state`, `round_started`, `vote_cast`, `round_revealed`, `round_finalized`, `error`).

- [ ] **Step 1: WS auth helper**

`apps/api/src/game/ws-auth.ts`:
```ts
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

export async function authenticate(socket: Socket, jwt: JwtService): Promise<string | null> {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return null;
  try {
    const p = await jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET });
    return p.sub as string;
  } catch { return null; }
}
```

- [ ] **Step 2: Gateway**

`apps/api/src/game/game.gateway.ts`:
```ts
import {
  ConnectedSocket, MessageBody, OnGatewayConnection,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { RoomsService } from '../rooms/rooms.service';
import { authenticate } from './ws-auth';

@WebSocketGateway({
  namespace: '/game',
  cors: { origin: process.env.CORS_ORIGIN, credentials: true },
})
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(
    private game: GameService,
    private rooms: RoomsService,
    private jwt: JwtService,
  ) {}

  async handleConnection(socket: Socket) {
    const userId = await authenticate(socket, this.jwt);
    if (!userId) { socket.emit('error', { message: 'Unauthorized' }); socket.disconnect(); return; }
    socket.data.userId = userId;
  }

  private async emitState(userId: string, roomId: string) {
    const state = await this.rooms.getRoom(userId, roomId);
    this.server.to(`room:${roomId}`).emit('room_state', state);
  }

  @SubscribeMessage('join_room')
  async onJoin(@ConnectedSocket() s: Socket, @MessageBody() { roomId }: { roomId: string }) {
    try {
      await this.rooms.assertMember(s.data.userId, roomId);
      s.join(`room:${roomId}`);
      await this.emitState(s.data.userId, roomId);
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('start_round')
  async onStart(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string; taskTitle: string }) {
    try {
      const round = await this.game.startRound(s.data.userId, b.roomId, b.taskTitle);
      this.server.to(`room:${b.roomId}`).emit('round_started', { roundId: round.id, taskTitle: round.taskTitle });
      await this.emitState(s.data.userId, b.roomId);
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('cast_vote')
  async onVote(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string; roundId: string; value: string }) {
    try {
      await this.game.castVote(s.data.userId, b.roundId, b.value);
      this.server.to(`room:${b.roomId}`).emit('vote_cast', { userId: s.data.userId });
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('reveal')
  async onReveal(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string; roundId: string }) {
    try {
      const { votes, avg } = await this.game.reveal(s.data.userId, b.roundId);
      this.server.to(`room:${b.roomId}`).emit('round_revealed', {
        roundId: b.roundId,
        votes: votes.map((v) => ({ userId: v.userId, name: v.user.name, value: v.value })),
        avg,
      });
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('set_final')
  async onFinal(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string; roundId: string; finalEstimate: string }) {
    try {
      await this.game.setFinal(s.data.userId, b.roundId, b.finalEstimate);
      this.server.to(`room:${b.roomId}`).emit('round_finalized', { roundId: b.roundId, finalEstimate: b.finalEstimate });
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('next_round')
  async onNext(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string }) {
    try { await this.emitState(s.data.userId, b.roomId); }
    catch (e: any) { s.emit('error', { message: e.message }); }
  }
}
```

- [ ] **Step 3: GameModule + wire**

`apps/api/src/game/game.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [RoomsModule, JwtModule.register({})],
  providers: [GameService, GameGateway],
})
export class GameModule {}
```

Add `GameModule` to `AppModule` imports.

- [ ] **Step 4: Boot check**

Run: `pnpm start:dev`
Expected: starts clean; log shows GameGateway subscribed. Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): socket.io game gateway with jwt handshake auth"
```

---

## Task 8: Web bootstrap + auth client + context

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/.env`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/lib/api.ts`, `apps/web/lib/auth-context.tsx`, `apps/web/lib/deck.ts`

**Interfaces:**
- Produces:
  - `api.request(path, opts)` — fetch wrapper, adds Bearer from in-memory token, `credentials:'include'`, on 401 tries `POST /auth/refresh` once then retries.
  - `api.setAccessToken(t)`, `api.getAccessToken()`.
  - `AuthProvider` + `useAuth()` → `{ user, login(email,pw), register(email,name,pw), logout(), loading }`.
  - `DECK: string[]`, `NUMERIC` helper.

- [ ] **Step 1: Init web**

```bash
cd apps/web
pnpm init
pnpm add next react react-dom socket.io-client
pnpm add -D typescript @types/react @types/node @types/react-dom
```

`apps/web/package.json` scripts:
```json
{ "scripts": { "dev": "next dev", "build": "next build", "start": "next start" } }
```

`apps/web/next.config.ts`:
```ts
import type { NextConfig } from 'next';
const config: NextConfig = {};
export default config;
```

`apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2021", "lib": ["dom", "dom.iterable", "ES2021"],
    "strict": true, "jsx": "preserve", "module": "esnext",
    "moduleResolution": "bundler", "esModuleInterop": true,
    "skipLibCheck": true, "noEmit": true, "plugins": [{ "name": "next" }]
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

`apps/web/.env`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

- [ ] **Step 2: deck.ts**

`apps/web/lib/deck.ts`:
```ts
export const DECK = ['1','2','3','5','8','13','21','34','55','89','?','☕'];
export const isNumeric = (v: string) => !Number.isNaN(Number(v));
```

- [ ] **Step 3: api.ts**

`apps/web/lib/api.ts`:
```ts
const BASE = process.env.NEXT_PUBLIC_API_URL!;
let accessToken: string | null = null;

export const api = {
  setAccessToken(t: string | null) { accessToken = t; },
  getAccessToken() { return accessToken; },

  async request<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(opts.headers ?? {}),
      },
    });
    if (res.status === 401 && retry) {
      const r = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (r.ok) { accessToken = (await r.json()).accessToken; return this.request<T>(path, opts, false); }
    }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return res.status === 204 ? (undefined as T) : res.json();
  },
};
```

- [ ] **Step 4: auth-context.tsx**

`apps/web/lib/auth-context.tsx`:
```tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

type User = { id: string; email: string; name: string };
type Ctx = {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Ctx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (r.ok) { api.setAccessToken((await r.json()).accessToken); setUser(await api.request('/auth/me')); }
      } catch { /* not logged in */ }
      setLoading(false);
    })();
  }, []);

  const handle = (data: { accessToken: string; user: User }) => {
    api.setAccessToken(data.accessToken); setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      login: async (email, password) =>
        handle(await api.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })),
      register: async (email, name, password) =>
        handle(await api.request('/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password }) })),
      logout: async () => { await api.request('/auth/logout', { method: 'POST' }); api.setAccessToken(null); setUser(null); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 5: layout + landing**

`apps/web/app/layout.tsx`:
```tsx
import { AuthProvider } from '../lib/auth-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es"><body><AuthProvider>{children}</AuthProvider></body></html>
  );
}
```

`apps/web/app/page.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) return <p>Cargando...</p>;
  return (
    <main style={{ padding: 40 }}>
      <h1>Scrum Poker</h1>
      {user
        ? <Link href="/dashboard">Ir al dashboard</Link>
        : <p><Link href="/login">Login</Link> · <Link href="/register">Registro</Link></p>}
    </main>
  );
}
```

- [ ] **Step 6: Run dev, verify landing**

Run: `pnpm dev` → open `http://localhost:3000`
Expected: "Scrum Poker" heading + login/register links. Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(web): next bootstrap, api client, auth context"
```

---

## Task 9: Web auth pages (login/register)

**Files:**
- Create: `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(auth)/register/page.tsx`

**Interfaces:**
- Consumes: `useAuth()`.
- Produces: `/login`, `/register` — on success `router.push('/dashboard')`.

- [ ] **Step 1: Login page**

`apps/web/app/(auth)/login/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await login(email, password); router.push('/dashboard'); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <main style={{ padding: 40, maxWidth: 320 }}>
      <h1>Login</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Entrar</button>
        {err && <p style={{ color: 'red' }}>{err}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Register page**

`apps/web/app/(auth)/register/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(''); const [name, setName] = useState('');
  const [password, setPassword] = useState(''); const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await register(email, name, password); router.push('/dashboard'); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <main style={{ padding: 40, maxWidth: 320 }}>
      <h1>Registro</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="nombre" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="password (min 6)" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Crear cuenta</button>
        {err && <p style={{ color: 'red' }}>{err}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Manual verify**

With API + DB running: `pnpm dev`, register a user → redirected to `/dashboard` (will 404 until Task 10, that's fine). Reload landing → shows "Ir al dashboard" (session persisted via refresh cookie).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(web): login and register pages"
```

---

## Task 10: Dashboard (create/join/list rooms)

**Files:**
- Create: `apps/web/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `api.request`.
- Produces: `/dashboard` — lists rooms (`GET /rooms`), create form (`POST /rooms`), join form (`POST /rooms/join`), links to `/room/{inviteCode}`, shows invite code per room.

- [ ] **Step 1: Dashboard page**

`apps/web/app/dashboard/page.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';

type Room = { id: string; name: string; inviteCode: string };

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  const load = () => api.request<Room[]>('/rooms').then(setRooms).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await api.request('/rooms', { method: 'POST', body: JSON.stringify({ name }) }); setName(''); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try {
      const room = await api.request<Room>('/rooms/join', { method: 'POST', body: JSON.stringify({ inviteCode: code.toUpperCase() }) });
      router.push(`/room/${room.inviteCode}`);
    } catch (e: any) { setErr(e.message); }
  };

  if (loading || !user) return <p>Cargando...</p>;
  return (
    <main style={{ padding: 40, maxWidth: 560 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Hola, {user.name}</h1>
        <button onClick={() => logout().then(() => router.push('/login'))}>Salir</button>
      </div>

      <section style={{ display: 'flex', gap: 24, marginTop: 16 }}>
        <form onSubmit={create}>
          <h3>Crear sala</h3>
          <input placeholder="nombre" value={name} onChange={e => setName(e.target.value)} />
          <button type="submit">Crear</button>
        </form>
        <form onSubmit={join}>
          <h3>Unirse</h3>
          <input placeholder="código" value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
          <button type="submit">Unirse</button>
        </form>
      </section>
      {err && <p style={{ color: 'red' }}>{err}</p>}

      <h3>Mis salas</h3>
      <ul>
        {rooms.map(r => (
          <li key={r.id}>
            <Link href={`/room/${r.inviteCode}`}>{r.name}</Link> — código <b>{r.inviteCode}</b>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Manual verify**

Login → dashboard. Create "Sprint 1" → appears in list with 6-char code. Join with that code → routed to `/room/{code}` (404 until Task 12).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(web): dashboard with create/join/list rooms"
```

---

## Task 11: Socket client + game components

**Files:**
- Create: `apps/web/lib/socket.ts`, `apps/web/components/Card.tsx`, `apps/web/components/MemberList.tsx`, `apps/web/components/HostControls.tsx`, `apps/web/components/HistoryPanel.tsx`

**Interfaces:**
- Consumes: `api.getAccessToken()`, socket.io-client.
- Produces:
  - `connectGame(): Socket` — connects `/game` namespace with `auth.token`.
  - `Card({ value, selected, onPick })`, `MemberList({ members, votedIds, revealed, votes })`, `HostControls({ isHost, onStart, onReveal, onFinal, activeRoundId, deck })`, `HistoryPanel({ rounds })`.

- [ ] **Step 1: socket.ts**

`apps/web/lib/socket.ts`:
```ts
import { io, Socket } from 'socket.io-client';
import { api } from './api';

export function connectGame(): Socket {
  return io(`${process.env.NEXT_PUBLIC_WS_URL}/game`, {
    auth: { token: api.getAccessToken() },
    transports: ['websocket'],
  });
}
```

- [ ] **Step 2: Card**

`apps/web/components/Card.tsx`:
```tsx
'use client';
export function Card({ value, selected, onPick }: { value: string; selected: boolean; onPick: (v: string) => void }) {
  return (
    <button
      onClick={() => onPick(value)}
      style={{
        width: 56, height: 84, fontSize: 20, borderRadius: 8, cursor: 'pointer',
        border: selected ? '2px solid #2563eb' : '1px solid #ccc',
        background: selected ? '#dbeafe' : '#fff',
      }}>
      {value}
    </button>
  );
}
```

- [ ] **Step 3: MemberList**

`apps/web/components/MemberList.tsx`:
```tsx
'use client';
type Member = { user: { id: string; name: string }; role: string };
type RevealVote = { userId: string; name: string; value: string };

export function MemberList({ members, votedIds, revealed, votes }: {
  members: Member[]; votedIds: Set<string>; revealed: boolean; votes: RevealVote[];
}) {
  const valueFor = (id: string) => votes.find(v => v.userId === id)?.value ?? '?';
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {members.map(m => (
        <li key={m.user.id} style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 64, border: '1px solid #999', borderRadius: 6,
            display: 'grid', placeItems: 'center', fontSize: 18,
            background: revealed ? '#eef' : votedIds.has(m.user.id) ? '#cfc' : '#eee',
          }}>
            {revealed ? valueFor(m.user.id) : votedIds.has(m.user.id) ? '✓' : ''}
          </div>
          <small>{m.user.name}{m.role === 'HOST' ? ' 👑' : ''}</small>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: HostControls**

`apps/web/components/HostControls.tsx`:
```tsx
'use client';
import { useState } from 'react';

export function HostControls({ isHost, activeRoundId, onStart, onReveal, onFinal, deck }: {
  isHost: boolean; activeRoundId: string | null;
  onStart: (title: string) => void; onReveal: () => void;
  onFinal: (value: string) => void; deck: string[];
}) {
  const [title, setTitle] = useState(''); const [final, setFinal] = useState(deck[0]);
  if (!isHost) return null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '16px 0' }}>
      {!activeRoundId
        ? <>
            <input placeholder="tarea a estimar" value={title} onChange={e => setTitle(e.target.value)} />
            <button onClick={() => { if (title) { onStart(title); setTitle(''); } }}>Iniciar ronda</button>
          </>
        : <>
            <button onClick={onReveal}>Revelar</button>
            <select value={final} onChange={e => setFinal(e.target.value)}>
              {deck.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={() => onFinal(final)}>Fijar estimación</button>
          </>}
    </div>
  );
}
```

- [ ] **Step 5: HistoryPanel**

`apps/web/components/HistoryPanel.tsx`:
```tsx
'use client';
type Round = { id: string; taskTitle: string; finalEstimate: string | null; avg: number | null };

export function HistoryPanel({ rounds }: { rounds: Round[] }) {
  if (!rounds.length) return null;
  return (
    <details style={{ marginTop: 24 }}>
      <summary>Historial ({rounds.length})</summary>
      <table style={{ marginTop: 8, borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ textAlign: 'left' }}>Tarea</th><th>Promedio</th><th>Final</th></tr></thead>
        <tbody>
          {rounds.map(r => (
            <tr key={r.id}>
              <td>{r.taskTitle}</td>
              <td style={{ textAlign: 'center' }}>{r.avg ?? '—'}</td>
              <td style={{ textAlign: 'center' }}>{r.finalEstimate ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(web): socket client + game UI components"
```

---

## Task 12: Room live table page

**Files:**
- Create: `apps/web/app/room/[code]/page.tsx`

**Interfaces:**
- Consumes: `useAuth`, `api.request`, `connectGame`, all Task 11 components, `DECK`.
- Produces: `/room/[code]` — resolves code→room via `GET /rooms` match, connects socket, wires events, renders table.

- [ ] **Step 1: Room page**

`apps/web/app/room/[code]/page.tsx`:
```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../../../lib/auth-context';
import { api } from '../../../lib/api';
import { connectGame } from '../../../lib/socket';
import { DECK } from '../../../lib/deck';
import { Card } from '../../../components/Card';
import { MemberList } from '../../../components/MemberList';
import { HostControls } from '../../../components/HostControls';
import { HistoryPanel } from '../../../components/HistoryPanel';

type Member = { user: { id: string; name: string }; role: string };
type State = {
  id: string; name: string; hostId: string; deck: string[];
  members: Member[];
  rounds: { id: string; taskTitle: string; votes: { userId: string }[] }[];
};
type RevealVote = { userId: string; name: string; value: string };

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  const [state, setState] = useState<State | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [votes, setVotes] = useState<RevealVote[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [err, setErr] = useState('');

  const roomId = state?.id ?? null;
  const activeRound = state?.rounds?.[0] ?? null;
  const isHost = !!(state && user && state.hostId === user.id);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);

  // resolve code -> roomId
  useEffect(() => {
    if (!user) return;
    api.request<any[]>('/rooms')
      .then(rooms => {
        const r = rooms.find(x => x.inviteCode === code);
        if (!r) { setErr('Sala no encontrada'); return; }
        return api.request<State>(`/rooms/${r.id}`).then(full => {
          setState(full);
          setVotedIds(new Set(full.rounds?.[0]?.votes.map((v: any) => v.userId) ?? []));
        });
      })
      .catch(e => setErr(e.message));
  }, [user, code]);

  const loadHistory = (rid: string) =>
    api.request<any[]>(`/rooms/${rid}/history`).then(setHistory).catch(() => {});

  // socket wiring
  useEffect(() => {
    if (!roomId) return;
    const s = connectGame();
    socketRef.current = s;
    s.emit('join_room', { roomId });

    s.on('room_state', (st: State) => {
      setState(st);
      const round = st.rounds?.[0] ?? null;
      setVotedIds(new Set(round?.votes.map((v: any) => v.userId) ?? []));
      if (!round) { setRevealed(false); setVotes([]); setAvg(null); setMyVote(null); }
      loadHistory(st.id);
    });
    s.on('round_started', () => { setRevealed(false); setVotes([]); setAvg(null); setMyVote(null); setVotedIds(new Set()); });
    s.on('vote_cast', ({ userId }: { userId: string }) => setVotedIds(prev => new Set(prev).add(userId)));
    s.on('round_revealed', ({ votes, avg }: { votes: RevealVote[]; avg: number | null }) => {
      setRevealed(true); setVotes(votes); setAvg(avg);
    });
    s.on('round_finalized', () => { if (roomId) loadHistory(roomId); });
    s.on('error', (e: { message: string }) => setErr(e.message));

    return () => { s.disconnect(); };
  }, [roomId]);

  const pick = (value: string) => {
    if (!activeRound || revealed) return;
    setMyVote(value);
    socketRef.current?.emit('cast_vote', { roomId, roundId: activeRound.id, value });
  };
  const start = (taskTitle: string) => socketRef.current?.emit('start_round', { roomId, taskTitle });
  const reveal = () => activeRound && socketRef.current?.emit('reveal', { roomId, roundId: activeRound.id });
  const setFinal = (finalEstimate: string) => {
    if (!activeRound) return;
    socketRef.current?.emit('set_final', { roomId, roundId: activeRound.id, finalEstimate });
  };

  if (loading || !user) return <p>Cargando...</p>;
  if (err) return <main style={{ padding: 40 }}><p style={{ color: 'red' }}>{err}</p></main>;
  if (!state) return <p>Cargando sala...</p>;

  return (
    <main style={{ padding: 40, maxWidth: 720 }}>
      <h1>{state.name} <small>({code})</small></h1>

      {activeRound
        ? <h3>Estimando: {activeRound.taskTitle}</h3>
        : <p>Sin ronda activa{isHost ? '. Inicia una.' : '. Espera al host.'}</p>}

      <MemberList members={state.members} votedIds={votedIds} revealed={revealed} votes={votes} />

      {revealed && <p><b>Promedio:</b> {avg ?? '—'}</p>}

      <HostControls
        isHost={isHost} activeRoundId={activeRound?.id ?? null}
        onStart={start} onReveal={reveal} onFinal={setFinal} deck={state.deck ?? DECK}
      />

      {activeRound && !revealed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {(state.deck ?? DECK).map(v => (
            <Card key={v} value={v} selected={myVote === v} onPick={pick} />
          ))}
        </div>
      )}

      <HistoryPanel rounds={history} />
    </main>
  );
}
```

- [ ] **Step 2: Full manual integration test**

Terminals: `pnpm db:up`; `cd apps/api && pnpm start:dev`; `cd apps/web && pnpm dev`.
- User A registers, creates room, copies code.
- User B (incognito) registers, joins by code.
- A starts round "Login page". Both pick cards → each sees ✓ on the other in real time.
- A reveals → both see values + average (numeric-only).
- A fixes final estimate → appears in history for both.
Expected: all real-time updates propagate; history grows.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(web): live poker room table with realtime socket wiring"
```

---

## Task 13: Full test run + README

**Files:**
- Create: `README.md`
- Run: full api test suite.

- [ ] **Step 1: Run all api tests**

Run: `cd apps/api && pnpm test && pnpm test:e2e`
Expected: all unit + e2e PASS (DB up).

- [ ] **Step 2: README**

`README.md`:
```markdown
# Scrum Poker

Planning Poker (Fibonacci) with real-time voting. Next.js + NestJS + Postgres.

## Dev
1. `pnpm install`
2. `pnpm db:up`
3. `cd apps/api && pnpm prisma migrate dev && pnpm start:dev`
4. `cd apps/web && pnpm dev`
5. Open http://localhost:3000

## Env
- api: `apps/api/.env` (DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, PORT)
- web: `apps/web/.env` (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL)
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: readme + full test pass"
```

---

## Self-Review Notes

- **Spec coverage:** auth (T3–4), rooms+invite (T5), realtime game/rounds/votes/reveal (T6–7,12), history persistence (T5 history + T6 reveal/setFinal), roles host/player (T5 assertMember + T6 assertHost), Fibonacci deck + avg exclusion (T2 default + T6 computeAvg), refresh-token rotation (T3 issueTokens), JWT socket auth (T7 ws-auth). All covered.
- **Placeholders:** T7 gateway intentionally shows then removes `pushState`/`roomHost` scaffolds (Step 3 deletes them) — final code has none.
- **Type consistency:** `assertMember` returns `MemberRole` (T5) consumed by `assertHost` (T6); token payload `{sub,email}` issued T3, verified T4/T7; `emitState(userId, roomId)` used consistently in T7; `inviteCode` 6-char (T5 genCode / T5 dto Length(6,6) / T10 maxLength 6).
