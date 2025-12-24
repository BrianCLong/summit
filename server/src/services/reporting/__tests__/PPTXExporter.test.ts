import { promises as fs } from 'fs';
import path from 'path';
import type PptxGenJS from 'pptxgenjs';
import { PPTXExporter } from '../exporters/PPTXExporter.js';
import type { Report } from '../types/Report.js';
import type { ReportTemplate } from '../types/Template.js';

class FakeSlide {
  addText = jest.fn();
}

class FakeDeck {
  title = '';
  slides: FakeSlide[] = [];
  addSlide = jest.fn<PptxGenJS.Slide, []>(() => {
    const slide = new FakeSlide();
    this.slides.push(slide);
    return slide as unknown as PptxGenJS.Slide;
  });

  write = jest.fn(async () => Buffer.from('pptx'));
}

describe('PPTXExporter', () => {
  let deck: FakeDeck;
  let exporter: PPTXExporter;

  beforeEach(() => {
    deck = new FakeDeck();
    exporter = new PPTXExporter(() => deck as unknown as PptxGenJS);
  });

  const template: ReportTemplate = {
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

  const report: Report = {
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

  it('creates a PPTX deck with content for each section', async () => {
    const result = await exporter.export(report, template);

    expect(result.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    expect(result.format).toBe('pptx');
    expect(result.buffer?.length).toBeGreaterThan(0);
    expect(result.size).toBeGreaterThan(0);
    expect(deck.addSlide).toHaveBeenCalledTimes(report.sections.length + 1);
    expect(deck.write).toHaveBeenCalledWith({ outputType: 'nodebuffer' });

    const filePath = result.path ?? path.join('/tmp', result.filename ?? '');
    const stats = await fs.stat(filePath);
    expect(stats.size).toBe(result.size);

    await fs.unlink(filePath);
  });
});
