import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import pino, { type Logger } from 'pino';
import auditEventSchema from '../../../schemas/audit_event_v1.tson';

export type AuditClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface AuditActor {
  type: 'user' | 'service' | 'system' | 'api' | 'automation';
  id?: string;
  name?: string;
  ip_address?: string;
}

export interface AuditResource {
  type: string;
  id?: string;
  name?: string;
  owner?: string;
}

export interface AuditEventV1 {
  version: 'audit_event_v1';
  actor: AuditActor;
  action: string;
  resource: AuditResource;
  classification: AuditClassification;
  policy_version: string;
  decision_id: string;
  trace_id: string;
  timestamp: string;
  customer?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditRecord {
  sequence: number;
  recorded_at: string;
  prev_hash: string;
  payload_hash: string;
  hash: string;
  event: AuditEventV1;
}

export interface VerificationResult {
  ok: boolean;
  checked: number;
  errors: string[];
  last_hash?: string;
}

export interface AppendOnlyAuditStoreOptions {
  filePath?: string;
  logger?: Logger;
}

const ajv = new Ajv({ allErrors: true, removeAdditional: true });
addFormats(ajv);
const validateEvent = ajv.compile<AuditEventV1>(auditEventSchema as any);

const canonicalizeEvent = (event: AuditEventV1): AuditEventV1 => ({
  version: event.version,
  actor: { ...event.actor },
  action: event.action,
  resource: { ...event.resource },
  classification: event.classification,
  policy_version: event.policy_version,
  decision_id: event.decision_id,
  trace_id: event.trace_id,
  timestamp: event.timestamp,
  customer: event.customer,
  metadata: event.metadata ? { ...event.metadata } : undefined,
});

const hashPayload = (event: AuditEventV1): string =>
  crypto.createHash('sha256').update(JSON.stringify(canonicalizeEvent(event))).digest('hex');

const hashRecord = (record: Omit<AuditRecord, 'hash'>): string =>
  crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        sequence: record.sequence,
        recorded_at: record.recorded_at,
        prev_hash: record.prev_hash,
        payload_hash: record.payload_hash,
      }),
    )
    .digest('hex');

const defaultStorePath = (): string =>
  process.env.AUDIT_EVENT_STORE ?? path.join(process.cwd(), 'logs', 'audit', 'audit-events.tsonl');

const readLastRecord = (filePath: string): AuditRecord | null => {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(Boolean);
  if (!lines.length) return null;
  try {
    return JSON.parse(lines[lines.length - 1]) as AuditRecord;
  } catch {
    return null;
  }
};

export class AppendOnlyAuditStore {
  private readonly filePath: string;
  private readonly logger: Logger;
  private sequence = 0;
  private lastHash = 'GENESIS';

  constructor(options: AppendOnlyAuditStoreOptions = {}) {
    this.filePath = options.filePath ?? defaultStorePath();
    this.logger =
      options.logger ??
      (pino as any)({
        name: 'append-only-audit-store',
        level: process.env.LOG_LEVEL || 'info',
      });

    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tail = readLastRecord(this.filePath);
    if (tail) {
      this.sequence = tail.sequence;
      this.lastHash = tail.hash;
    }
  }

  async append(event: AuditEventV1): Promise<AuditRecord> {
    const candidate: AuditEventV1 = {
      ...event,
      trace_id: event.trace_id || crypto.randomUUID(),
      timestamp: event.timestamp || new Date().toISOString(),
    };

    const valid = validateEvent(candidate);
    if (!valid) {
      const errors = validateEvent.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`Invalid audit event: ${errors ?? 'unknown error'}`);
    }

    const payload_hash = hashPayload(candidate);
    const recordBase: Omit<AuditRecord, 'hash'> = {
      sequence: this.sequence + 1,
      recorded_at: new Date().toISOString(),
      prev_hash: this.lastHash,
      payload_hash,
      event: canonicalizeEvent(candidate),
    };

    const hash = hashRecord(recordBase);
    const record: AuditRecord = { ...recordBase, hash };

    await fs.promises.appendFile(this.filePath, `${JSON.stringify(record)}\n`, 'utf8');

    this.sequence = record.sequence;
    this.lastHash = record.hash;
    this.logger.debug({ sequence: record.sequence, hash: record.hash }, 'Appended audit record');
    return record;
  }

  async verify(): Promise<VerificationResult> {
    if (!fs.existsSync(this.filePath)) {
      return { ok: true, checked: 0, errors: [] };
    }

    const contents = await fs.promises.readFile(this.filePath, 'utf8');
    const lines = contents.split('\n').filter(Boolean);
    let expectedPrev = 'GENESIS';
    const errors: string[] = [];
    let lastHash: string | undefined;

    lines.forEach((line: string, index: number) => {
      let record: AuditRecord;
      try {
        record = JSON.parse(line) as AuditRecord;
      } catch {
        errors.push(`line ${index + 1}: invalid JSON`);
        return;
      }

      const computed = hashRecord({
        sequence: record.sequence,
        recorded_at: record.recorded_at,
        prev_hash: record.prev_hash,
        payload_hash: record.payload_hash,
        event: record.event,
      });

      if (record.prev_hash !== expectedPrev) {
        errors.push(
          `line ${index + 1}: prev_hash mismatch (expected ${expectedPrev}, got ${record.prev_hash})`,
        );
      }

      if (computed !== record.hash) {
        errors.push(
          `line ${index + 1}: hash mismatch (expected ${computed}, got ${record.hash})`,
        );
      }

      expectedPrev = record.hash;
      lastHash = record.hash;
    });

    return {
      ok: errors.length === 0,
      checked: lines.length,
      errors,
      last_hash: lastHash,
    } as VerificationResult;
  }

  async readRange(
    options: { from?: string; to?: string; customer?: string } = {},
  ): Promise<AuditRecord[]> {
    if (!fs.existsSync(this.filePath)) return [];
    const contents = await fs.promises.readFile(this.filePath, 'utf8');
    const lines = contents.split('\n').filter(Boolean);
    const fromTime = options.from ? new Date(options.from).getTime() : null;
    const toTime = options.to ? new Date(options.to).getTime() : null;

    return lines
      .map((line: string) => JSON.parse(line) as AuditRecord)
      .filter((record: AuditRecord) => {
        const eventTime = new Date(record.event.timestamp).getTime();
        const matchesCustomer = options.customer
          ? record.event.customer === options.customer
          : true;
        const afterFrom = fromTime !== null ? eventTime >= fromTime : true;
        const beforeTo = toTime !== null ? eventTime <= toTime : true;
        return matchesCustomer && afterFrom && beforeTo;
      });
  }
}

export const auditEventHash = hashPayload;
export const auditRecordHash = hashRecord;
