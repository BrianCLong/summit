import { appendFileSync } from 'fs';

import type { BreakGlassMetadata } from './types';

export interface AuditEntry {
  subject: string;
  action: string;
  resource: string;
  tenantId: string;
  allowed: boolean;
  reason: string;
  breakGlass?: BreakGlassMetadata;
  event?: string;
}

export function log(entry: AuditEntry) {
  const record = { ...entry, ts: new Date().toISOString() };
  appendFileSync('audit.log', JSON.stringify(record) + '\n');
}
