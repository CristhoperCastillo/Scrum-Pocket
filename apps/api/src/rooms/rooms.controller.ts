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
