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
