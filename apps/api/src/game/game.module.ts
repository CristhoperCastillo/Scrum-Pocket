import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [RoomsModule, JwtModule.register({})],
  providers: [GameService, GameGateway],
})
export class GameModule {}
