"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonExporter = void 0;
class JsonExporter {
    format = 'json';
    async export(data, options = {}) {
        const payload = {
            data,
            watermark: options.watermark,
            generatedAt: new Date().toISOString(),
        };
        const buffer = Buffer.from(JSON.stringify(payload, null, 2));
        return {
            buffer,
            fileName: `report-${Date.now()}.json`,
            mimeType: 'application/json',
            format: this.format,
        };
    }
}
exports.JsonExporter = JsonExporter;
