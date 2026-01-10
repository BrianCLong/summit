import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

import type { BreakGlassMetadata } from './types';

export interface AuditMetadata {
  service: string;
  version?: string;
  environment?: string;
  host?: string;
}

export interface AuditEntry {
  subject: string;
  action: string;
  resource: string;
  tenantId: string;
  allowed: boolean;
  reason: string;
  decisionId?: string;
  policyVersion?: string;
  inputsHash?: string;
  breakGlass?: BreakGlassMetadata;
  clientId?: string;
  apiMethod?: string;
  correlationId?: string;
  traceId?: string;
  event?: AuditMetadata;
  checksum?: string;
  previousChecksum?: string | null;
  ts?: string;
}

export interface AuditBusOptions {
  hmacKey: string;
  logPath?: string;
  now?: () => number;
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  includeHostname?: boolean;
}

export class AuditBus {
  private readonly hmacKey: string;

  private readonly logPath: string;

  private readonly now: () => number;

  private lastChecksum: string | null = null;

  private readonly metadata: AuditMetadata;

  constructor(options: AuditBusOptions) {
    this.hmacKey = options.hmacKey;
    this.logPath = options.logPath || 'audit.log';
    this.now = options.now || Date.now;
    this.metadata = {
      service: options.serviceName || 'authz-gateway',
      version: options.serviceVersion,
      environment: options.environment || process.env.NODE_ENV || 'development',
      host: options.includeHostname === false ? undefined : os.hostname(),
    };

    this.ensureLogDirectory();
    this.lastChecksum = this.rehydrateLastChecksum();
  }

  publish(entry: AuditEntry): AuditEntry {
    const enriched: AuditEntry = {
      ...entry,
      ts: new Date(this.now()).toISOString(),
      previousChecksum: this.lastChecksum,
      event: {
        ...this.metadata,
        ...entry.event,
      },
    };
    const checksum = this.computeChecksum(enriched);
    const record: AuditEntry = { ...enriched, checksum };
    fs.appendFileSync(this.logPath, JSON.stringify(record) + '\n');
    this.lastChecksum = checksum;
    return record;
  }

  private ensureLogDirectory() {
    const directory = path.dirname(this.logPath);
    if (directory && directory !== '.') {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  private rehydrateLastChecksum(): string | null {
    if (!fs.existsSync(this.logPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(this.logPath, 'utf8').trim();
      if (!content) {
        return null;
      }
      const lines = content.split('\n');
      const lastLine = lines[lines.length - 1];
      const parsed = JSON.parse(lastLine) as Partial<AuditEntry>;
      return typeof parsed.checksum === 'string' ? parsed.checksum : null;
    } catch {
      return null;
    }
  }

  private computeChecksum(entry: AuditEntry): string {
    const { checksum: _ignored, ...record } = entry;
    const payload = JSON.stringify(record);
    return crypto.createHmac('sha256', this.hmacKey).update(payload).digest('hex');
  }
}

const defaultAuditBus = process.env.AUDIT_HMAC_KEY
  ? new AuditBus({
      hmacKey: process.env.AUDIT_HMAC_KEY,
      logPath: process.env.AUDIT_LOG_PATH,
      serviceName: process.env.SERVICE_NAME,
      serviceVersion: process.env.SERVICE_VERSION,
      environment: process.env.NODE_ENV,
    })
  : null;

export function log(entry: AuditEntry) {
  try {
    if (defaultAuditBus) {
      defaultAuditBus.publish(entry);
      return;
    }
    const record = { ...entry, ts: new Date().toISOString() };
    fs.appendFileSync('audit.log', JSON.stringify(record) + '\n');
  } catch (error) {
    // Logging must never crash the gateway; swallow errors intentionally.
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error('audit_log_failure', error);
    }
  }
}
