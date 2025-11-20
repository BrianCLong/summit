import { BaseExtractor, ExtractionResult, ExtractorConfig } from '@intelgraph/metadata-extractor';
import { PDFMetadata, DocumentExtractionResult } from './types.js';

/**
 * Extractor for PDF documents
 * Note: This is a simplified implementation. A production version would use
 * libraries like pdf-parse, pdf-lib, or pdfjs-dist for comprehensive extraction
 */
export class PDFExtractor extends BaseExtractor {
  readonly name = 'pdf-extractor';
  readonly supportedTypes = ['application/pdf'];

  canExtract(file: string | Buffer, mimeType?: string): boolean {
    if (mimeType === 'application/pdf') {
      return true;
    }

    // Check PDF magic bytes
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
    const header = buffer.slice(0, 5).toString('ascii');
    return header === '%PDF-';
  }

  protected async extractInternal(
    file: string | Buffer,
    config: ExtractorConfig
  ): Promise<Partial<DocumentExtractionResult>> {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    // Extract PDF version
    const version = this.extractVersion(buffer);

    // Extract PDF metadata from Info dictionary
    const info = this.extractInfoDictionary(buffer);

    // Detect encryption
    const encrypted = this.detectEncryption(buffer);

    // Detect JavaScript
    const hasJavaScript = this.detectJavaScript(buffer);

    // Detect forms
    const hasForms = this.detectForms(buffer);

    // Count pages (simplified)
    const pages = this.countPages(buffer);

    const pdfMetadata: PDFMetadata = {
      version,
      title: info.Title,
      subject: info.Subject,
      keywords: info.Keywords ? info.Keywords.split(/[,;]/).map(k => k.trim()) : undefined,
      producer: info.Producer,
      creator: info.Creator,
      pages,
      encrypted,
      javascript: hasJavaScript,
      forms: hasForms,
    };

    return {
      base: {
        extractedAt: new Date(),
        extractorVersion: this.name,
        sourceType: 'pdf-document',
        confidence: 0.9,
      },
      temporal: {
        created: info.CreationDate ? this.parsePDFDate(info.CreationDate) : undefined,
        modified: info.ModDate ? this.parsePDFDate(info.ModDate) : undefined,
      },
      attribution: {
        author: info.Author,
        softwareName: info.Producer,
      },
      document: {
        pdf: pdfMetadata,
      },
      anomalies: encrypted ? [{
        type: 'encryption_detected',
        severity: 'medium',
        description: 'PDF is encrypted',
        evidence: { encrypted: true },
      }] : undefined,
    };
  }

  private extractVersion(buffer: Buffer): string | undefined {
    const header = buffer.slice(0, 20).toString('ascii');
    const match = header.match(/%PDF-(\d+\.\d+)/);
    return match ? match[1] : undefined;
  }

  private extractInfoDictionary(buffer: Buffer): any {
    const content = buffer.toString('latin1');
    const info: any = {};

    // Simple regex-based extraction (production would use proper PDF parser)
    const patterns = {
      Title: /\/Title\s*\(([^)]+)\)/,
      Author: /\/Author\s*\(([^)]+)\)/,
      Subject: /\/Subject\s*\(([^)]+)\)/,
      Keywords: /\/Keywords\s*\(([^)]+)\)/,
      Creator: /\/Creator\s*\(([^)]+)\)/,
      Producer: /\/Producer\s*\(([^)]+)\)/,
      CreationDate: /\/CreationDate\s*\(([^)]+)\)/,
      ModDate: /\/ModDate\s*\(([^)]+)\)/,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = content.match(pattern);
      if (match) {
        info[key] = match[1];
      }
    }

    return info;
  }

  private detectEncryption(buffer: Buffer): boolean {
    const content = buffer.toString('latin1');
    return content.includes('/Encrypt');
  }

  private detectJavaScript(buffer: Buffer): boolean {
    const content = buffer.toString('latin1');
    return content.includes('/JavaScript') || content.includes('/JS');
  }

  private detectForms(buffer: Buffer): boolean {
    const content = buffer.toString('latin1');
    return content.includes('/AcroForm') || content.includes('/XFA');
  }

  private countPages(buffer: Buffer): number | undefined {
    const content = buffer.toString('latin1');
    const match = content.match(/\/Type\s*\/Pages[^]*?\/Count\s+(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }

  private parsePDFDate(dateStr: string): Date | undefined {
    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm
    const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (!match) return undefined;

    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }
}
