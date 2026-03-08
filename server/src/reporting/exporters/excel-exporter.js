"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelExporter = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const base_js_1 = require("./base.js");
class ExcelExporter {
    format = 'xlsx';
    async export(data, options = {}) {
        const workbook = new exceljs_1.default.Workbook();
        const sheet = workbook.addWorksheet('Report');
        const rows = (0, base_js_1.normalizeTabularData)(data);
        const headers = Object.keys(rows[0] || { value: 'value' });
        sheet.addRow(headers);
        rows.forEach((row) => sheet.addRow(headers.map((key) => row[key] ?? '')));
        if (options.watermark) {
            const watermarkSheet = workbook.addWorksheet('Watermark');
            watermarkSheet.getCell('A1').value = options.watermark;
            watermarkSheet.getCell('A1').font = { color: { argb: '80C0C0C0' }, bold: true, size: 20 };
            watermarkSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return {
            buffer: Buffer.from(buffer),
            fileName: `report-${Date.now()}.xlsx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            format: this.format,
        };
    }
}
exports.ExcelExporter = ExcelExporter;
