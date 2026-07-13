import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
// pdfmake 0.3.x es la rama inestable/master; usa 0.2.x para server-side (require CJS clásico)
import PdfPrinter = require('pdfmake');

export type ExportRow = {
  story: string;
  user: string;
  value: string;
  final: string;
};

@Injectable()
export class VotesExportService {
  async generateExcel(rows: ExportRow[], roomName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Planning Poker';
    const sheet = workbook.addWorksheet(roomName.slice(0, 31) || 'Votos');

    sheet.columns = [
      { header: 'Historia', key: 'story', width: 32 },
      { header: 'Participante', key: 'user', width: 25 },
      { header: 'Voto', key: 'value', width: 10 },
      { header: 'Estimación final', key: 'final', width: 18 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFEFEF' },
    };

    rows.forEach((r) => sheet.addRow(r));

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 4 },
    };

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async generatePdf(rows: ExportRow[], roomName: string): Promise<Buffer> {
    const fonts = {
      Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold' },
    };
    // PdfPrinter's typings don't expose a construct signature; cast to any to instantiate
    const printer = new (PdfPrinter as any)(fonts);

    const body = [
      [
        { text: 'Historia', bold: true },
        { text: 'Participante', bold: true },
        { text: 'Voto', bold: true },
        { text: 'Final', bold: true },
      ],
      ...rows.map((r) => [r.story, r.user, r.value, r.final]),
    ];

    const docDefinition = {
      content: [
        { text: `Resultados de votación — ${roomName}`, style: 'header' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 'auto', 'auto'],
            body,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 12] as [number, number, number, number],
        },
      },
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on('data', (chunk : any) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}