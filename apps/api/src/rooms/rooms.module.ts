import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { VotesExportController } from './votes-export.controller';
import { VotesExportService } from './votes-export.service';

@Module({ 
    providers: [RoomsService, VotesExportService], 
    controllers: [RoomsController, VotesExportController], 
    exports: [RoomsService],
     
})
export class RoomsModule {}
