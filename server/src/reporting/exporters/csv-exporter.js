"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvExporter = void 0;
// @ts-nocheck
const json2csv_1 = require("json2csv");
const base_js_1 = require("./base.js");
class CsvExporter {
    format = 'csv';
    async export(data, options = {}) {
        const rows = (0, base_js_1.normalizeTabularData)(data);
        const csv = (0, json2csv_1.parse)(rows, { withBOM: true });
        const content = options.watermark ? `# ${options.watermark}\n${csv}` : csv;
        return {
            buffer: Buffer.from(content),
            fileName: `report-${Date.now()}.csv`,
            mimeType: 'text/csv',
            format: this.format,
        };
    }
}
exports.CsvExporter = CsvExporter;
