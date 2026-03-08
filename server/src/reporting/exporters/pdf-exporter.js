"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfExporter = void 0;
// @ts-nocheck
const pdfkit_1 = __importDefault(require("pdfkit"));
const base_js_1 = require("./base.js");
function renderTable(doc, rows) {
    const keys = Object.keys(rows[0] || { value: 'value' });
    doc.font('Helvetica-Bold').fontSize(10).text(keys.join(' | '));
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10);
    rows.forEach((row) => {
        const line = keys.map((key) => String(row[key] ?? '')).join(' | ');
        doc.text(line);
    });
}
class PdfExporter {
    format = 'pdf';
    async export(data, options = {}) {
        const doc = new pdfkit_1.default({ margin: 48 });
        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        if (options.watermark) {
            doc
                .fontSize(48)
                .fillColor('#e0e0e0')
                .opacity(0.25)
                .rotate(-30, { origin: [250, 300] })
                .text(options.watermark, 50, 150, { align: 'center' })
                .rotate(30, { origin: [250, 300] })
                .opacity(1)
                .fillColor('black');
        }
        doc.fontSize(16).text(options.title || 'Intelligence Report', { align: 'left' });
        doc.moveDown();
        const rows = (0, base_js_1.normalizeTabularData)(data);
        renderTable(doc, rows);
        doc.end();
        await new Promise((resolve) => doc.on('end', resolve));
        return {
            buffer: Buffer.concat(buffers),
            fileName: `report-${Date.now()}.pdf`,
            mimeType: 'application/pdf',
            format: this.format,
        };
    }
}
exports.PdfExporter = PdfExporter;
