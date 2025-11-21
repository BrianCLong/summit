import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * Export format extension point
 */
export interface ExportExtension extends ExtensionPoint<ExportInput, ExportResult> {
  type: 'export';
  format: string;
  mimeType: string;
  fileExtension: string;
}

export interface ExportInput {
  data: any;
  options?: {
    includeMetadata?: boolean;
    compress?: boolean;
    formatting?: 'compact' | 'pretty';
    [key: string]: any;
  };
}

export interface ExportResult {
  content: Buffer | string;
  filename: string;
  mimeType: string;
}

export abstract class BaseExportExtension implements ExportExtension {
  readonly type = 'export' as const;

  constructor(
    public readonly id: string,
    public readonly format: string,
    public readonly mimeType: string,
    public readonly fileExtension: string
  ) {}

  abstract execute(input: ExportInput): Promise<ExportResult>;
}
