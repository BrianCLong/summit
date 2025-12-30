import { ExportOptions, ReportExporter } from './base.js';
import { ReportArtifact } from '../types.js';

export class XmlExporter implements ReportExporter {
  readonly format = 'xml' as const;

  async export(data: unknown, options: ExportOptions = {}): Promise<ReportArtifact> {
    const xmlContent = this.toXml(data, 'root', options.watermark);

    return {
      buffer: Buffer.from(xmlContent),
      fileName: `report-${Date.now()}.xml`,
      mimeType: 'application/xml',
      format: this.format,
    };
  }

  private toXml(data: unknown, rootName: string = 'root', watermark?: string): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    if (watermark) {
      xml += `<!-- Watermark: ${watermark} -->\n`;
    }
    xml += this.serialize(data, rootName);
    return xml;
  }

  private serialize(data: unknown, tagName: string): string {
    const safeTagName = this.sanitizeTagName(tagName);

    if (data === null || data === undefined) {
      return `<${safeTagName} />`;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.serialize(item, safeTagName)).join('\n');
    }

    if (typeof data === 'object') {
      const children = Object.entries(data as Record<string, unknown>)
        .map(([key, value]) => this.serialize(value, key))
        .join('\n');
      return `<${safeTagName}>\n${children}\n</${safeTagName}>`;
    }

    // Escape special characters for text content
    const text = String(data)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<${safeTagName}>${text}</${safeTagName}>`;
  }

  private sanitizeTagName(name: string): string {
    // XML tags must start with a letter or underscore
    // Subsequent characters can be letters, digits, hyphens, underscores, periods
    // We replace invalid characters with underscores
    let safe = name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    // Ensure it starts with a letter or underscore
    if (!/^[a-zA-Z_]/.test(safe)) {
      safe = '_' + safe;
    }

    return safe || 'item'; // Fallback for empty strings
  }
}
