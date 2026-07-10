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
