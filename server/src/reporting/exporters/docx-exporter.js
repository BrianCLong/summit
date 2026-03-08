"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocxExporter = void 0;
const docx_1 = require("docx");
const base_js_1 = require("./base.js");
class DocxExporter {
    format = 'docx';
    async export(data, options = {}) {
        const dataRows = (0, base_js_1.normalizeTabularData)(data);
        const headers = Object.keys(dataRows[0] || { value: 'value' });
        const table = new docx_1.Table({
            rows: [
                new docx_1.TableRow({
                    children: headers.map((header) => new docx_1.TableCell({
                        children: [new docx_1.Paragraph({ text: header, heading: docx_1.HeadingLevel.HEADING_3 })],
                    })),
                }),
                ...dataRows.map((row) => new docx_1.TableRow({
                    children: headers.map((header) => new docx_1.TableCell({
                        children: [new docx_1.Paragraph(String(row[header] ?? ''))],
                    })),
                })),
            ],
        });
        const doc = new docx_1.Document({
            sections: [
                {
                    children: [
                        new docx_1.Paragraph({
                            text: options.title || 'Executive Briefing',
                            heading: docx_1.HeadingLevel.HEADING_1,
                        }),
                        ...(options.watermark
                            ? [
                                new docx_1.Paragraph({
                                    children: [
                                        new docx_1.TextRun({
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
        const buffer = await docx_1.Packer.toBuffer(doc);
        return {
            buffer,
            fileName: `report-${Date.now()}.docx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            format: this.format,
        };
    }
}
exports.DocxExporter = DocxExporter;
