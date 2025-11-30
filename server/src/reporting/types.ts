export type ReportFormat =
  | 'json'
  | 'csv'
  | 'pdf'
  | 'xlsx'
  | 'docx'
  | 'pptx'
  | 'txt';

export type DeliveryChannel = 'email' | 'slack' | 'webhook';

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  format: ReportFormat;
  defaultWatermark?: string;
}

export interface ReportContext {
  [key: string]: unknown;
}

export interface ReportArtifact {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  format: ReportFormat;
  metadata?: Record<string, unknown>;
}

export interface ReportRenderResult {
  rendered: string;
  context: ReportContext;
}

export interface ReportRequest {
  template: ReportTemplate;
  context: ReportContext;
  watermark?: string;
  recipients?: DeliveryInstruction;
}

export interface DeliveryAttempt {
  channel: DeliveryChannel;
  status: 'sent' | 'failed';
  error?: string;
}

export interface DeliveryResult {
  attempts: DeliveryAttempt[];
}

export interface DeliveryInstruction {
  channels: DeliveryChannel[];
  email?: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
  };
  slack?: {
    webhookUrl: string;
    text?: string;
  };
  webhook?: {
    url: string;
    headers?: Record<string, string>;
    payload?: Record<string, unknown>;
  };
}

export interface ScheduledReportJob {
  id: string;
  name: string;
  cron: string;
  request: ReportRequest;
  timezone?: string;
}

export interface ReportVersion {
  id: string;
  templateId: string;
  checksum: string;
  createdAt: Date;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export interface AccessContext {
  userId: string;
  roles: string[];
  permissions?: string[];
}

export interface AccessRule {
  resource: string;
  action: 'view' | 'create' | 'update' | 'deliver';
  roles: string[];
}
