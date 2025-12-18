/**
 * Report Assembly Types
 */

export interface RenderContext {
  title: string;
  briefingType: string;
  classificationLevel: string;
  sensitivityMarkings: string[];
  generatedAt: string;
  generatedBy: string;
  caseId: string;
  data: Record<string, unknown>;
}

export interface RenderResult {
  content: string | Buffer;
  format: 'html' | 'pdf' | 'pptx' | 'json';
  mimeType: string;
  filename: string;
  metadata: Record<string, unknown>;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  briefingTypes: string[];
  sections: TemplateSectionDef[];
  styles: string;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface TemplateSectionDef {
  id: string;
  name: string;
  template: string;
  order: number;
  required: boolean;
  dataPath?: string;
}

export interface SlideTemplate {
  id: string;
  name: string;
  layout: 'title' | 'content' | 'two_column' | 'bullets' | 'image' | 'chart';
  template: string;
}

export interface ExportOptions {
  format: 'html' | 'pdf' | 'pptx';
  includeWatermark: boolean;
  includePageNumbers: boolean;
  includeTableOfContents: boolean;
  paperSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
}
