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
