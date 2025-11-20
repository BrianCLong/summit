/**
 * Core type definitions for the Reporting Service
 * Provides type safety and clear contracts for all report-related operations
 */

export type ReportStatus = 'QUEUED' | 'GENERATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ReportFormat = 'PDF' | 'HTML' | 'DOCX' | 'JSON' | 'CSV' | 'EXCEL' | 'PPT' | 'GEPHI';

export type AccessLevel = 'ANALYST' | 'SENIOR_ANALYST' | 'SUPERVISOR' | 'SYSTEM_ADMIN';

export interface ReportParameter {
  name: string;
  type: 'string' | 'boolean' | 'integer' | 'float' | 'enum' | 'daterange';
  required?: boolean;
  default?: any;
  min?: number;
  max?: number;
  options?: string[];
}

export interface ReportSection {
  name: string;
  title: string;
  data: any;
  generatedAt: Date;
}

export interface Report {
  id: string;
  templateId: string;
  parameters: Record<string, any>;
  requestedFormat: ReportFormat;
  requestedBy: string;
  status: ReportStatus;
  createdAt: Date;
  startTime?: number;
  endTime?: number;
  executionTime?: number;
  progress: number;
  estimatedCompletion: Date | null;
  sections: ReportSection[];
  data: Record<string, any>;
  metadata: Record<string, any>;
  outputPath?: string;
  outputSize?: number;
  outputMimeType?: string;
  error?: string;
  retryCount?: number;
}

export interface ReportRequest {
  templateId: string;
  parameters: Record<string, any>;
  format?: ReportFormat;
  userId: string;
  scheduledReportId?: string;
}

export interface ReportMetadata {
  reportId: string;
  templateId: string;
  generatedAt: Date;
  generatedBy: string;
  parameters: Record<string, any>;
}

export interface ExportResult {
  format: string;
  path?: string;
  size?: number;
  mimeType?: string;
  buffer?: Buffer;
  filename?: string;
  html?: string;
  css?: string;
  json?: string;
  csv?: string;
  gexf?: string;
}

export interface ReportMetrics {
  totalReports: number;
  completedReports: number;
  failedReports: number;
  totalExports: number;
  averageGenerationTime: number;
  scheduledReportsActive: number;
  dashboardViews: number;
}
