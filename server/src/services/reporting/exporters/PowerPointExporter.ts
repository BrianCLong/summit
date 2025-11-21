/**
 * PowerPoint Report Exporter
 * Exports reports to Microsoft PowerPoint format
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseReportExporter } from './IReportExporter.js';
import type { Report, ExportResult } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';

export class PowerPointExporter extends BaseReportExporter {
  readonly format = 'PPT';
  readonly mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  readonly extension = 'pptx';
  readonly supports = ['slides', 'images', 'charts', 'styling'];

  async export(report: Report, template: ReportTemplate): Promise<ExportResult> {
    // In a full implementation, this would use pptxgenjs
    const content = this.generatePPTContent(report, template);

    const filename = this.generateFilename(report);
    const filepath = path.join('/tmp', filename);

    await fs.writeFile(filepath, content);

    return {
      format: 'pptx',
      path: filepath,
      size: Buffer.byteLength(content),
      mimeType: this.mimeType,
      filename,
    };
  }

  private generatePPTContent(report: Report, template: ReportTemplate): string {
    // Simplified XML structure for PPTX
    const slides = report.sections.map((section, i) => `
      <p:sld>
        <p:cSld name="Slide ${i + 1}">
          <p:spTree>
            <p:sp><p:txBody><a:p><a:r><a:t>${section.title}</a:t></a:r></a:p></p:txBody></p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
  </p:sldIdLst>
  ${slides}
</p:presentation>`;
  }
}
