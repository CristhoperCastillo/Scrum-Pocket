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
