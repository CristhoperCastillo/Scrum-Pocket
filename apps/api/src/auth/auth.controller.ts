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
