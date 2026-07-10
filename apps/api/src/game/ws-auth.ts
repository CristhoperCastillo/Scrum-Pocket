import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

export async function authenticate(socket: Socket, jwt: JwtService): Promise<string | null> {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return null;
  try {
    const p = await jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET as string });
    return p.sub as string;
  } catch { return null; }
}
