import { appendFileSync } from 'fs';
import { createHash, createHmac, randomUUID } from 'crypto';
import type { DecisionObligation, ResourceAttributes } from './types';

export interface AuditEntry {
  subject: string;
  action: string;
  resource: string;
  tenantId: string;
  allowed: boolean;
  reason: string;
  traceId?: string;
  clientId?: string;
  apiMethod?: string;
  obligations?: DecisionObligation[];
  resourceAttributes?: ResourceAttributes;
  context?: Record<string, unknown>;
}

export interface AuditRecord {
  version: string;
  id: string;
  timestamp: string;
  sequence: number;
  checksum: string;
  previousChecksum: string;
  event: AuditEntry & { service: string };
}

interface AuditBusOptions {
  logPath?: string;
  hmacKey?: string;
  service?: string;
  now?: () => number;
}

export class AuditBus {
  private logPath: string;
  private hmacKey?: string;
  private service: string;
  private now: () => number;
  private sequence = 0;
  private previousChecksum = '';

  constructor(options: AuditBusOptions = {}) {
    this.logPath = options.logPath || process.env.AUDIT_LOG_PATH || 'audit.log';
    this.hmacKey = options.hmacKey || process.env.AUDIT_HMAC_KEY;
    this.service = options.service || 'authz-gateway';
    this.now = options.now || Date.now;
  }

  publish(entry: AuditEntry): AuditRecord {
    const sequence = ++this.sequence;
    const timestamp = new Date(this.now()).toISOString();
    const payload: Omit<AuditRecord, 'checksum'> = {
      version: '1.0.0',
      id: `audit-${timestamp}-${sequence}-${randomUUID()}`,
      timestamp,
      sequence,
      previousChecksum: this.previousChecksum,
      event: { ...entry, service: this.service },
    };

    const checksum = this.calculateChecksum(payload);
    this.previousChecksum = checksum;

    const record: AuditRecord = { ...payload, checksum };
    appendFileSync(this.logPath, JSON.stringify(record) + '\n');
    return record;
  }

  reset(options: Partial<AuditBusOptions> = {}) {
    this.sequence = 0;
    this.previousChecksum = '';
    this.logPath =
      options.logPath || process.env.AUDIT_LOG_PATH || this.logPath;
    this.hmacKey = options.hmacKey || process.env.AUDIT_HMAC_KEY;
    this.service = options.service || this.service;
    this.now = options.now || this.now;
  }

  private calculateChecksum(payload: Omit<AuditRecord, 'checksum'>): string {
    const serialized = JSON.stringify(payload);
    if (this.hmacKey) {
      return createHmac('sha256', this.hmacKey)
        .update(serialized)
        .digest('hex');
    }
    return createHash('sha256').update(serialized).digest('hex');
  }
}

let auditBus: AuditBus | null = null;
let currentLogPath: string | undefined;
let currentHmacKey: string | undefined;
let currentService: string | undefined;

function getAuditBus(): AuditBus {
  const desiredLogPath = process.env.AUDIT_LOG_PATH || 'audit.log';
  const desiredHmacKey = process.env.AUDIT_HMAC_KEY;
  const desiredService = process.env.AUDIT_SERVICE || 'authz-gateway';
  if (!auditBus) {
    auditBus = new AuditBus({
      logPath: desiredLogPath,
      hmacKey: desiredHmacKey,
      service: desiredService,
    });
    currentLogPath = desiredLogPath;
    currentHmacKey = desiredHmacKey;
    currentService = desiredService;
  } else if (
    desiredLogPath !== currentLogPath ||
    desiredHmacKey !== currentHmacKey ||
    desiredService !== currentService
  ) {
    auditBus.reset({
      logPath: desiredLogPath,
      hmacKey: desiredHmacKey,
      service: desiredService,
    });
    currentLogPath = desiredLogPath;
    currentHmacKey = desiredHmacKey;
    currentService = desiredService;
  }
  return auditBus;
}

export function configureAuditBus(options: Partial<AuditBusOptions> = {}) {
  if (!auditBus) {
    auditBus = new AuditBus(options);
  } else {
    auditBus.reset(options);
  }
  currentLogPath =
    options.logPath ||
    currentLogPath ||
    process.env.AUDIT_LOG_PATH ||
    'audit.log';
  currentHmacKey =
    options.hmacKey || currentHmacKey || process.env.AUDIT_HMAC_KEY;
  currentService =
    options.service ||
    currentService ||
    process.env.AUDIT_SERVICE ||
    'authz-gateway';
}

export function log(entry: AuditEntry): AuditRecord {
  return getAuditBus().publish(entry);
}
