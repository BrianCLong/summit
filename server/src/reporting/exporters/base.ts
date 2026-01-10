import { ReportArtifact, ReportFormat } from '../types.js';

export interface ExportOptions {
  watermark?: string;
  title?: string;
}

export interface ReportExporter {
  readonly format: ReportFormat;
  export(data: unknown, options?: ExportOptions): Promise<ReportArtifact>;
}

export type TabularRow = Record<string, unknown>;

export function normalizeTabularData(data: unknown): TabularRow[] {
  if (Array.isArray(data)) {
    return data.map((row: any) => (typeof row === 'object' ? (row as TabularRow) : { value: row }));
  }
  if (typeof data === 'object') return [(data || {}) as TabularRow];
  return [{ value: data }];
}
