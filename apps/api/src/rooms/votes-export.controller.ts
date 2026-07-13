import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ajusta la ruta a la real en tu proyecto
import { RoomsService } from './rooms.service';
import { VotesExportService, ExportRow } from './votes-export.service';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class VotesExportController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly votesExportService: VotesExportService,
  ) {}

  @Get(':id/export/:format')
  async export(
    @Param('id') roomId: string,
    @Param('format') format: string,
    @Req() req: any, // req.user viene de tu JwtStrategy — ajusta si tu payload usa otro shape
    @Res() res: Response,
  ) {
    if (format !== 'excel' && format !== 'pdf') {
      throw new BadRequestException('Formato inválido, usa "excel" o "pdf"');
    }

    const userId = req.user.userId; 
    const rounds = await this.roomsService.history(userId, roomId);

    const rows: ExportRow[] = rounds.flatMap((round: any) =>
      (round.votes ?? []).map((v: any) => ({
        story: round.taskTitle,
        user: v.user?.name ?? v.userId,
        value: v.value,
        final: round.finalEstimate ?? '',
      })),
    );

    // history() no trae el nombre de la sala; lo usamos solo para el nombre del archivo
    const filenameBase = `sala-${roomId.slice(0, 8)}`;

    if (format === 'excel') {
      const buffer = await this.votesExportService.generateExcel(rows, filenameBase);
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=votos-${filenameBase}.xlsx`,
      });
      return res.send(buffer);
    }

    const buffer = await this.votesExportService.generatePdf(rows, filenameBase);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=votos-${filenameBase}.pdf`,
    });
    res.send(buffer);
  }
}