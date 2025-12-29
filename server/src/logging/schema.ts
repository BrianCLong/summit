export type StructuredLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface StructuredLogSchema {
  timestamp: string;
  level: StructuredLogLevel;
  msg: string;
  correlationId: string;
  tenantId?: string;
  component: string;
  [key: string]: unknown;
}

export const REQUIRED_LOG_FIELDS: Array<keyof StructuredLogSchema> = [
  'timestamp',
  'level',
  'msg',
  'correlationId',
  'component',
];
