import { appendFileSync } from 'fs';

export interface AuditEntry {
  subject: string;
  action: string;
  resource: string;
  tenantId: string;
  allowed: boolean;
  reason: string;
  details?: Record<string, unknown>;
}

const auditLogPath = process.env.AUDIT_LOG_PATH || 'audit.log';

export function log(entry: AuditEntry) {
  const record = { ...entry, ts: new Date().toISOString() };
  appendFileSync(auditLogPath, JSON.stringify(record) + '\n');
}
