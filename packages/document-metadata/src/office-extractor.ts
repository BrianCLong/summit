import { BaseExtractor, ExtractionResult, ExtractorConfig } from '@intelgraph/metadata-extractor';
import { OfficeMetadata, DocumentExtractionResult } from './types.js';
import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

/**
 * Extractor for Microsoft Office documents (.docx, .xlsx, .pptx)
 */
export class OfficeExtractor extends BaseExtractor {
  readonly name = 'office-extractor';
  readonly supportedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-word',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
  ];

  canExtract(file: string | Buffer, mimeType?: string): boolean {
    if (mimeType && this.supportedTypes.includes(mimeType)) {
      return true;
    }

    // Check magic bytes for ZIP (Office files are ZIP containers)
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
    const header = buffer.slice(0, 4).toString('hex');
    return header === '504b0304'; // ZIP header
  }

  protected async extractInternal(
    file: string | Buffer,
    config: ExtractorConfig
  ): Promise<Partial<DocumentExtractionResult>> {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
    const zip = await JSZip.loadAsync(buffer);

    // Determine document type
    const docType = this.detectDocumentType(zip);

    // Extract core properties
    const coreProps = await this.extractCoreProperties(zip);

    // Extract app properties
    const appProps = await this.extractAppProperties(zip);

    // Extract custom properties
    const customProps = await this.extractCustomProperties(zip);

    // Detect macros
    const hasMacros = await this.detectMacros(zip);

    // Extract embedded objects
    const embeddedObjects = config.extractEmbedded
      ? await this.extractEmbeddedObjects(zip)
      : undefined;

    // Extract fonts and styles
    const { fontNames, styleNames } = await this.extractFontsAndStyles(zip, docType);

    // Extract external links
    const externalLinks = await this.extractExternalLinks(zip, docType);

    const officeMetadata: OfficeMetadata = {
      type: docType,
      title: coreProps.title,
      subject: coreProps.subject,
      keywords: coreProps.keywords,
      category: coreProps.category,
      comments: coreProps.comments,
      pages: appProps.pages,
      slides: appProps.slides,
      sheets: appProps.sheets,
      words: appProps.words,
      characters: appProps.characters,
      lines: appProps.lines,
      paragraphs: appProps.paragraphs,
      language: appProps.language,
      contentStatus: coreProps.contentStatus,
      revision: coreProps.revision,
      totalEditTime: appProps.totalEditTime,
      fontNames,
      styleNames,
      embeddedObjects,
      macros: hasMacros,
      externalLinks,
    };

    return {
      base: {
        extractedAt: new Date(),
        extractorVersion: this.name,
        sourceType: 'office-document',
        confidence: 1.0,
      },
      temporal: {
        created: coreProps.created,
        modified: coreProps.modified,
      },
      attribution: {
        author: coreProps.creator,
        lastModifiedBy: coreProps.lastModifiedBy,
        revision: coreProps.revision,
      },
      document: {
        office: officeMetadata,
      },
    };
  }

  private detectDocumentType(zip: JSZip): 'word' | 'excel' | 'powerpoint' | 'onenote' {
    if (zip.file(/word\//i).length > 0) return 'word';
    if (zip.file(/xl\//i).length > 0) return 'excel';
    if (zip.file(/ppt\//i).length > 0) return 'powerpoint';
    return 'word'; // default
  }

  private async extractCoreProperties(zip: JSZip): Promise<any> {
    const corePropsFile = zip.file('docProps/core.xml');
    if (!corePropsFile) return {};

    const content = await corePropsFile.async('text');
    const parsed = await parseXML(content);

    const props = parsed['cp:coreProperties'] || parsed.coreProperties || {};
    const dc = props['dc:creator'] || props.creator || [];
    const dcterms = props['dcterms:created'] || props.created || [];

    return {
      title: props['dc:title']?.[0] || undefined,
      subject: props['dc:subject']?.[0] || undefined,
      keywords: props['cp:keywords']?.[0]?.split(/[,;]/).map((k: string) => k.trim()) || [],
      category: props['cp:category']?.[0] || undefined,
      comments: props['dc:description']?.[0] || undefined,
      creator: dc[0] || undefined,
      lastModifiedBy: props['cp:lastModifiedBy']?.[0] || undefined,
      revision: props['cp:revision']?.[0] ? parseInt(props['cp:revision'][0]) : undefined,
      created: dcterms[0] ? new Date(dcterms[0]) : undefined,
      modified: props['dcterms:modified']?.[0] ? new Date(props['dcterms:modified'][0]) : undefined,
      contentStatus: props['cp:contentStatus']?.[0] || undefined,
    };
  }

  private async extractAppProperties(zip: JSZip): Promise<any> {
    const appPropsFile = zip.file('docProps/app.xml');
    if (!appPropsFile) return {};

    const content = await appPropsFile.async('text');
    const parsed = await parseXML(content);

    const props = parsed.Properties || {};

    return {
      pages: props.Pages?.[0] ? parseInt(props.Pages[0]) : undefined,
      slides: props.Slides?.[0] ? parseInt(props.Slides[0]) : undefined,
      sheets: props.Sheets?.[0] ? parseInt(props.Sheets[0]) : undefined,
      words: props.Words?.[0] ? parseInt(props.Words[0]) : undefined,
      characters: props.Characters?.[0] ? parseInt(props.Characters[0]) : undefined,
      lines: props.Lines?.[0] ? parseInt(props.Lines[0]) : undefined,
      paragraphs: props.Paragraphs?.[0] ? parseInt(props.Paragraphs[0]) : undefined,
      language: props.Language?.[0] || undefined,
      totalEditTime: props.TotalTime?.[0] ? parseInt(props.TotalTime[0]) : undefined,
    };
  }

  private async extractCustomProperties(zip: JSZip): Promise<any> {
    const customPropsFile = zip.file('docProps/custom.xml');
    if (!customPropsFile) return {};

    const content = await customPropsFile.async('text');
    const parsed = await parseXML(content);

    return parsed.Properties || {};
  }

  private async detectMacros(zip: JSZip): Promise<boolean> {
    const vbaFiles = zip.file(/vbaProject\.bin$/i);
    return vbaFiles.length > 0;
  }

  private async extractEmbeddedObjects(zip: JSZip): Promise<any[]> {
    const embeddings: any[] = [];
    const embedFiles = zip.file(/embeddings\//i);

    for (const file of embedFiles) {
      const content = await file.async('nodebuffer');
      embeddings.push({
        type: 'embedded',
        name: file.name,
        size: content.length,
      });
    }

    return embeddings;
  }

  private async extractFontsAndStyles(
    zip: JSZip,
    docType: string
  ): Promise<{ fontNames?: string[]; styleNames?: string[] }> {
    const fontNames = new Set<string>();
    const styleNames = new Set<string>();

    if (docType === 'word') {
      const stylesFile = zip.file('word/styles.xml');
      if (stylesFile) {
        const content = await stylesFile.async('text');
        const parsed = await parseXML(content);

        const styles = parsed['w:styles']?.['w:style'] || [];
        for (const style of styles) {
          if (style.$?.['w:styleId']) {
            styleNames.add(style.$['w:styleId']);
          }
        }
      }
    }

    return {
      fontNames: fontNames.size > 0 ? Array.from(fontNames) : undefined,
      styleNames: styleNames.size > 0 ? Array.from(styleNames) : undefined,
    };
  }

  private async extractExternalLinks(zip: JSZip, docType: string): Promise<string[] | undefined> {
    const links = new Set<string>();

    if (docType === 'word') {
      const relsFiles = zip.file(/word\/_rels\/.*\.xml\.rels$/i);
      for (const file of relsFiles) {
        const content = await file.async('text');
        const parsed = await parseXML(content);

        const relationships = parsed.Relationships?.Relationship || [];
        for (const rel of relationships) {
          if (rel.$?.Target && rel.$.Target.startsWith('http')) {
            links.add(rel.$.Target);
          }
        }
      }
    }

    return links.size > 0 ? Array.from(links) : undefined;
  }
}
