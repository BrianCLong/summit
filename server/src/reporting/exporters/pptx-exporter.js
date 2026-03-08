"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PptxExporter = void 0;
const pptxgenjs_1 = __importDefault(require("pptxgenjs"));
const PptxGenJS = pptxgenjs_1.default.default || pptxgenjs_1.default;
const base_js_1 = require("./base.js");
class PptxExporter {
    format = 'pptx';
    async export(data, options = {}) {
        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();
        slide.addText(options.title || 'Threat Assessment', {
            x: 0.5,
            y: 0.3,
            fontSize: 20,
            bold: true,
        });
        const rows = (0, base_js_1.normalizeTabularData)(data);
        const headers = Object.keys(rows[0] || { value: 'value' });
        const tableRows = [headers, ...rows.map((row) => headers.map((key) => `${row[key] ?? ''}`))];
        slide.addTable(tableRows, { x: 0.5, y: 1, w: 9, fontSize: 12 });
        if (options.watermark) {
            slide.addText(options.watermark, {
                x: 1,
                y: 4,
                fontSize: 30,
                color: 'c0c0c0',
                rotate: -25,
                bold: true,
                transparency: 50,
            });
        }
        const buffer = await pptx.write('arraybuffer');
        return {
            buffer: Buffer.from(buffer),
            fileName: `report-${Date.now()}.pptx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            format: this.format,
        };
    }
}
exports.PptxExporter = PptxExporter;
