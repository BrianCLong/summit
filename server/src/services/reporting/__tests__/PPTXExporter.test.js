"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const PPTXExporter_js_1 = require("../exporters/PPTXExporter.js");
class FakeSlide {
    addText = globals_1.jest.fn();
}
class FakeDeck {
    title = '';
    slides = [];
    addSlide = globals_1.jest.fn(() => {
        const slide = new FakeSlide();
        this.slides.push(slide);
        return slide;
    });
    write = globals_1.jest.fn(async () => Buffer.from('pptx'));
}
(0, globals_1.describe)('PPTXExporter', () => {
    let deck;
    let exporter;
    (0, globals_1.beforeEach)(() => {
        deck = new FakeDeck();
        exporter = new PPTXExporter_js_1.PPTXExporter(() => deck);
    });
    const template = {
        id: 'template-1',
        name: 'Analyst Briefing Deck',
        description: 'Auto-generated briefing with evidence snapshots.',
        category: 'ANALYSIS',
        sections: ['Summary', 'Findings'],
        parameters: [],
        outputFormats: ['PPTX', 'PDF'],
        exportFormats: ['PPTX', 'PDF'],
        estimatedTime: 1,
        accessLevel: 'ANALYST',
    };
    const report = {
        id: 'report-123',
        templateId: template.id,
        parameters: {},
        requestedFormat: 'PPTX',
        requestedBy: 'tester@summit.local',
        status: 'COMPLETED',
        createdAt: new Date(),
        progress: 100,
        estimatedCompletion: new Date(),
        sections: [
            {
                name: 'summary',
                title: 'Executive Summary',
                data: 'Operational highlights and key risk items.',
                generatedAt: new Date(),
            },
            {
                name: 'assets',
                title: 'Asset Inventory',
                data: [
                    { name: 'Jet A7-ADW', status: 'tracked', confidence: 0.92 },
                    { name: 'Yacht Solaris', status: 'anchored', confidence: 0.88 },
                ],
                generatedAt: new Date(),
            },
        ],
        data: {},
        metadata: {},
    };
    (0, globals_1.it)('creates a PPTX deck with content for each section', async () => {
        const result = await exporter.export(report, template);
        (0, globals_1.expect)(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
        (0, globals_1.expect)(result.format).toBe('pptx');
        (0, globals_1.expect)(result.buffer?.length).toBeGreaterThan(0);
        (0, globals_1.expect)(result.size).toBeGreaterThan(0);
        (0, globals_1.expect)(deck.addSlide).toHaveBeenCalledTimes(report.sections.length + 1);
        (0, globals_1.expect)(deck.write).toHaveBeenCalledWith({ outputType: 'nodebuffer' });
        const filePath = result.path ?? path_1.default.join('/tmp', result.filename ?? '');
        const stats = await fs_1.promises.stat(filePath);
        (0, globals_1.expect)(stats.size).toBe(result.size);
        await fs_1.promises.unlink(filePath);
    });
});
