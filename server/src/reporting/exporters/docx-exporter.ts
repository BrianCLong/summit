import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';
import { ExportOptions, ReportExporter, normalizeTabularData } from './base';
import { ReportArtifact } from '../types';

export class DocxExporter implements ReportExporter {
  readonly format = 'docx' as const;

  async export(data: unknown, options: ExportOptions = {}): Promise<ReportArtifact> {
    const rows = normalizeTabularData(data);
    const headers = Object.keys(rows[0] || { value: 'value' });

    const table = new Table({
      rows: [
        new TableRow({
          children: headers.map(
            (header) =>
              new TableCell({
                children: [new Paragraph({ text: header, heading: HeadingLevel.HEADING_3 })],
              }),
          ),
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              children: headers.map((header) =>
                new TableCell({
                  children: [new Paragraph(String(row[header] ?? ''))],
                }),
              ),
            }),
        ),
      ],
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: options.title || 'Executive Briefing',
              heading: HeadingLevel.HEADING_1,
            }),
            ...(options.watermark
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: options.watermark,
                        italics: true,
                        color: '808080',
                      }),
                    ],
                  }),
                ]
              : []),
            table,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return {
      buffer,
      fileName: `report-${Date.now()}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      format: this.format,
    };
  }
}
