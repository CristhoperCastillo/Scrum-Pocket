import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
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
    const userIds = (
      await prisma.user.findMany({ where: { email: { in: [hostEmail, playerEmail] } }, select: { id: true } })
    ).map((u) => u.id);
    await prisma.room.deleteMany({ where: { hostId: { in: userIds } } });
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
