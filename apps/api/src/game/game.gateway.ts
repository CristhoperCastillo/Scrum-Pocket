import {
  ConnectedSocket, MessageBody, OnGatewayConnection,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { RoomsService } from '../rooms/rooms.service';
import { authenticate } from './ws-auth';

@WebSocketGateway({
  namespace: '/game',
  cors: { origin: process.env.CORS_ORIGIN, credentials: true },
})
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(
    private game: GameService,
    private rooms: RoomsService,
    private jwt: JwtService,
  ) {}

  async handleConnection(socket: Socket) {
    const userId = await authenticate(socket, this.jwt);
    if (!userId) { socket.emit('error', { message: 'Unauthorized' }); socket.disconnect(); return; }
    socket.data.userId = userId;
  }

  private async emitState(userId: string, roomId: string) {
    const state = await this.rooms.getRoom(userId, roomId);
    this.server.to(`room:${roomId}`).emit('room_state', state);
  }

  @SubscribeMessage('join_room')
  async onJoin(@ConnectedSocket() s: Socket, @MessageBody() { roomId }: { roomId: string }) {
    try {
      await this.rooms.assertMember(s.data.userId, roomId);
      s.join(`room:${roomId}`);
      await this.emitState(s.data.userId, roomId);
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('start_round')
  async onStart(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string; taskTitle: string }) {
    try {
      const round = await this.game.startRound(s.data.userId, b.roomId, b.taskTitle);
      this.server.to(`room:${b.roomId}`).emit('round_started', { roundId: round.id, taskTitle: round.taskTitle });
      await this.emitState(s.data.userId, b.roomId);
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('cast_vote')
  async onVote(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string; roundId: string; value: string }) {
    try {
      await this.game.castVote(s.data.userId, b.roundId, b.value);
      this.server.to(`room:${b.roomId}`).emit('vote_cast', { userId: s.data.userId });
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('reveal')
  async onReveal(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string; roundId: string }) {
    try {
      const { votes, avg } = await this.game.reveal(s.data.userId, b.roundId);
      this.server.to(`room:${b.roomId}`).emit('round_revealed', {
        roundId: b.roundId,
        votes: votes.map((v) => ({ userId: v.userId, name: v.user.name, value: v.value })),
        avg,
      });
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('set_final')
  async onFinal(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string; roundId: string; finalEstimate: string }) {
    try {
      await this.game.setFinal(s.data.userId, b.roundId, b.finalEstimate);
      this.server.to(`room:${b.roomId}`).emit('round_finalized', { roundId: b.roundId, finalEstimate: b.finalEstimate });
    } catch (e: any) { s.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('next_round')
  async onNext(@ConnectedSocket() s: Socket, @MessageBody() b: { roomId: string }) {
    try { await this.emitState(s.data.userId, b.roomId); }
    catch (e: any) { s.emit('error', { message: e.message }); }
  }
}
