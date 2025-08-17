import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { trace, SpanKind } from '@opentelemetry/api';

export interface AuditLogEntry {
  timestamp: string;
  user: string | null;
  action: string;
  resource: string;
  before?: unknown;
  after?: unknown;
  decision: 'allow' | 'deny';
  reason?: string;
  requestId?: string;
  prevHash: string | null;
  hash: string;
  hmac: string;
  keyId: string;
}

const logFile =
  process.env.AUDIT_LOG_FILE || path.join(process.cwd(), 'server', 'audit.log');
const hmacKey = process.env.AUDIT_HMAC_KEY || 'dev_audit_key';
const keyId = process.env.AUDIT_HMAC_KEY_ID || 'dev';

let lastHash: string | null = null;

if (fs.existsSync(logFile)) {
  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
  if (lines.length) {
    try {
      const last = JSON.parse(lines[lines.length - 1]);
      lastHash = last.hash;
    } catch {
      lastHash = null;
    }
  }
}

const redact = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value;
  const clone: any = Array.isArray(value) ? [...value] : { ...value };
  for (const k of Object.keys(clone)) {
    if (k.toLowerCase().includes('password') || k.toLowerCase().includes('secret')) {
      clone[k] = '[REDACTED]';
    }
  }
  return clone;
};

export async function writeAuditLog(entry: {
  user: string | null;
  action: string;
  resource: string;
  before?: unknown;
  after?: unknown;
  decision: 'allow' | 'deny';
  reason?: string;
  requestId?: string;
}): Promise<void> {
  const timestamp = new Date().toISOString();
  const base = {
    timestamp,
    user: entry.user,
    action: entry.action,
    resource: entry.resource,
    before: redact(entry.before),
    after: redact(entry.after),
    decision: entry.decision,
    reason: entry.reason,
    requestId: entry.requestId,
    prevHash: lastHash,
    keyId,
  };
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(base))
    .digest('hex');
  const hmac = crypto.createHmac('sha256', hmacKey).update(hash).digest('hex');
  const fullEntry: AuditLogEntry = { ...base, hash, hmac };
  fs.appendFileSync(logFile, JSON.stringify(fullEntry) + '\n');
  lastHash = hash;

  const tracer = trace.getTracer('audit');
  const span = tracer.startSpan(`audit.${entry.action}`, {
    kind: SpanKind.INTERNAL,
  });
  span.setAttributes({
    'audit.user': entry.user || 'anonymous',
    'audit.action': entry.action,
    'audit.resource': entry.resource,
    'audit.decision': entry.decision,
    'audit.request_id': entry.requestId || '',
  });
  span.end();
}

export function resetAuditState() {
  lastHash = null;
}
