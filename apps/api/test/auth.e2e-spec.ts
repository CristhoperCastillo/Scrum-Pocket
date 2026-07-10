import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser = require('cookie-parser');
import request = require('supertest');
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
