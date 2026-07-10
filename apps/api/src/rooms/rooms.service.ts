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
