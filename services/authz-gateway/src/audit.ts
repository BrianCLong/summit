import { appendFileSync } from 'fs';
import { randomUUID } from 'crypto';
import type { PolicyDecision } from './policy';

export interface AuditInput {
  subject: string;
  action: string;
  resource: string;
  tenantId: string;
  decision: PolicyDecision;
  purpose: string;
  authority: string;
}

export interface AuditEntry extends AuditInput {
  id: string;
  timestamp: string;
}

const auditLog = new Map<string, AuditEntry>();

export function log(entry: AuditInput): AuditEntry {
  const record: AuditEntry = {
    ...entry,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  auditLog.set(record.id, record);
  appendFileSync('audit.log', JSON.stringify(record) + '\n');
  return record;
}

export function getAuditEntry(id: string): AuditEntry | undefined {
  return auditLog.get(id);
}

export function resetAuditLog() {
  auditLog.clear();
}
