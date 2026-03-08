"use strict";
// @ts-nocheck
/**
 * PPTX Report Exporter
 * Generates briefing-ready PPTX decks with slide-per-section summaries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PPTXExporter = void 0;
const pptxgenjs_1 = __importDefault(require("pptxgenjs"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const IReportExporter_js_1 = require("./IReportExporter.js");
class PPTXExporter extends IReportExporter_js_1.BaseReportExporter {
    pptxFactory;
    format = 'PPTX';
    mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    extension = 'pptx';
    supports = ['text', 'images', 'charts', 'tables', 'styling'];
    constructor(pptxFactory = () => new pptxgenjs_1.default()) {
        super();
        this.pptxFactory = pptxFactory;
    }
    async export(report, template) {
        const pptx = this.pptxFactory();
        const title = this.getReportTitle(report, template);
        pptx.title = title;
        this.addTitleSlide(pptx, title, report);
        this.addSectionSlides(pptx, report);
        const output = await pptx.write({ outputType: 'nodebuffer' });
        const buffer = Buffer.isBuffer(output)
            ? output
            : Buffer.from(output);
        const filename = this.generateFilename(report);
        const filepath = path_1.default.join('/tmp', filename);
        await fs_1.promises.writeFile(filepath, buffer);
        return {
            format: this.extension,
            path: filepath,
            size: buffer.length,
            mimeType: this.mimeType,
            filename,
            buffer,
        };
    }
    addTitleSlide(pptx, title, report) {
        const slide = pptx.addSlide();
        slide.addText(title, {
            x: 0.5,
            y: 1,
            w: 9,
            h: 1.5,
            fontSize: 32,
            bold: true,
            color: '1F2937',
        });
        slide.addText(`Generated for ${report.requestedBy || 'Analyst'}`, {
            x: 0.5,
            y: 2.2,
            w: 9,
            fontSize: 18,
            color: '4B5563',
        });
        const generatedAt = report.createdAt
            ? new Date(report.createdAt).toISOString()
            : new Date().toISOString();
        slide.addText(`Created: ${generatedAt}`, {
            x: 0.5,
            y: 2.8,
            w: 9,
            fontSize: 14,
            color: '6B7280',
        });
    }
    addSectionSlides(pptx, report) {
        report.sections.forEach((section, index) => {
            const slide = pptx.addSlide();
            const sectionTitle = section.title || section.name || `Section ${index + 1}`;
            slide.addText(sectionTitle, {
                x: 0.5,
                y: 0.6,
                w: 9,
                h: 0.6,
                fontSize: 24,
                bold: true,
                color: '111827',
            });
            const summary = this.buildSectionSummary(section.data);
            slide.addText(summary || 'No content available for this section.', {
                x: 0.5,
                y: 1.4,
                w: 9,
                h: 5,
                fontSize: 14,
                color: '1F2937',
                valign: 'top',
                wrap: true,
            });
            slide.addText(`Updated: ${section.generatedAt ? new Date(section.generatedAt).toISOString() : 'N/A'}`, {
                x: 0.5,
                y: 6.6,
                w: 9,
                fontSize: 12,
                color: '6B7280',
            });
        });
    }
    buildSectionSummary(data) {
        if (!data) {
            return '';
        }
        if (typeof data === 'string') {
            return data;
        }
        if (Array.isArray(data)) {
            return data
                .slice(0, 8)
                .map((item) => `• ${this.stringifyItem(item)}`)
                .join('\n');
        }
        return this.stringifyItem(data);
    }
    stringifyItem(item) {
        if (item === null || item === undefined) {
            return '';
        }
        if (typeof item === 'string') {
            return item;
        }
        if (typeof item === 'number' || typeof item === 'boolean') {
            return String(item);
        }
        try {
            const json = JSON.stringify(item, null, 2);
            return json.length > 800 ? `${json.slice(0, 797)}...` : json;
        }
        catch {
            return '[unserializable section content]';
        }
    }
}
exports.PPTXExporter = PPTXExporter;
