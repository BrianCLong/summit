import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pino, { type Logger } from 'pino';
import { logEventBus, type LogEvent, type LogEventBus } from '../logging/logEventBus.js';

export interface AuditLedgerEntry {
  eventId: string;
  prevHash: string;
  eventHash: string;
  payloadHash: string;
  timestamp: string;
}

export interface AuditLedgerVerification {
  ok: boolean;
  checked: number;
  errors: string[];
  lastHash?: string;
  since?: string;
}

export interface AuditLedgerOptions {
  ledgerFilePath?: string;
  bus?: LogEventBus;
  logger?: Logger;
}

export interface AuditLedgerPayload {
  level: LogEvent['level'];
  timestamp: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  tenantId?: string;
  source?: string;
  service?: string;
}

const defaultLedgerFilePath = (): string => {
  const auditDir =
    process.env.AUDIT_LOG_DIR ?? path.join(process.cwd(), 'logs', 'audit');
  return path.join(auditDir, 'audit-ledger.jsonl');
};

export const getLedgerFilePath = (): string =>
  process.env.AUDIT_LEDGER_FILE ?? defaultLedgerFilePath();

export const safePayloadFromEvent = (event: LogEvent): AuditLedgerPayload => ({
  level: event.level,
  timestamp: event.timestamp ?? new Date().toISOString(),
  correlationId: event.correlationId,
  traceId: event.traceId,
  spanId: event.spanId,
  tenantId: event.tenantId,
  source: event.source,
  service: event.service,
});

export const hashPayload = (payload: AuditLedgerPayload): string =>
  crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const hashEntry = (entry: Omit<AuditLedgerEntry, 'eventHash'>): string =>
  crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        eventId: entry.eventId,
        prevHash: entry.prevHash,
        payloadHash: entry.payloadHash,
        timestamp: entry.timestamp,
      }),
    )
    .digest('hex');

const readLastLedgerEntry = (ledgerFilePath: string): AuditLedgerEntry | null => {
  if (!fs.existsSync(ledgerFilePath)) {
    return null;
  }

  const contents = fs.readFileSync(ledgerFilePath, 'utf8');
  const lines = contents.split('\n').filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  try {
    return JSON.parse(lines[lines.length - 1]) as AuditLedgerEntry;
  } catch {
    return null;
  }
};

export class AuditLedger {
  private readonly ledgerFilePath: string;
  private readonly logger: Logger;
  private readonly unsubscribe: () => void;
  private lastHash = 'GENESIS';

  constructor(options: AuditLedgerOptions = {}) {
    this.ledgerFilePath = options.ledgerFilePath ?? getLedgerFilePath();
    this.logger =
      options.logger ??
      (pino as any)({
        name: 'audit-ledger',
        level: process.env.LOG_LEVEL || 'info',
      });

    fs.mkdirSync(path.dirname(this.ledgerFilePath), { recursive: true });

    const lastEntry = readLastLedgerEntry(this.ledgerFilePath);
    if (lastEntry?.eventHash) {
      this.lastHash = lastEntry.eventHash;
    }

    const bus = options.bus ?? logEventBus;
    this.unsubscribe = bus.subscribe((event) => {
      this.recordEvent(event).catch((error) => {
        this.logger.error({ error }, 'Failed to append audit ledger entry');
      });
    });
  }

  stop(): void {
    this.unsubscribe();
  }

  async recordEvent(event: LogEvent): Promise<void> {
    const payload = safePayloadFromEvent(event);
    const payloadHash = hashPayload(payload);
    const entry: Omit<AuditLedgerEntry, 'eventHash'> = {
      eventId: crypto.randomUUID(),
      prevHash: this.lastHash,
      payloadHash,
      timestamp: payload.timestamp,
    };
    const eventHash = hashEntry(entry);
    const record: AuditLedgerEntry = { ...entry, eventHash };
    await fs.promises.appendFile(
      this.ledgerFilePath,
      `${JSON.stringify(record)}\n`,
      'utf8',
    );
    this.lastHash = eventHash;
  }
}

export const verifyAuditLedgerChain = async ({
  ledgerFilePath = getLedgerFilePath(),
  since,
}: {
  ledgerFilePath?: string;
  since?: string;
} = {}): Promise<AuditLedgerVerification> => {
  if (!fs.existsSync(ledgerFilePath)) {
    return {
      ok: true,
      checked: 0,
      errors: [],
      lastHash: undefined,
      since,
    };
  }

  const contents = await fs.promises.readFile(ledgerFilePath, 'utf8');
  const lines = contents.split('\n').filter(Boolean);
  const errors: string[] = [];
  let expectedPrevHash = 'GENESIS';
  let checked = 0;
  let lastHash: string | undefined;
  const sinceTime = since ? new Date(since).getTime() : null;

  lines.forEach((line: string, index: number) => {
    let entry: AuditLedgerEntry;
    try {
      entry = JSON.parse(line) as AuditLedgerEntry;
    } catch {
      errors.push(`line ${index + 1}: invalid JSON`);
      return;
    }

    const entryTime = Number.isFinite(new Date(entry.timestamp).getTime())
      ? new Date(entry.timestamp).getTime()
      : null;
    const inRange = sinceTime === null || (entryTime !== null && entryTime >= sinceTime);

    const computedHash = hashEntry({
      eventId: entry.eventId,
      prevHash: entry.prevHash,
      payloadHash: entry.payloadHash,
      timestamp: entry.timestamp,
    });

    if (entry.prevHash !== expectedPrevHash) {
      if (inRange) {
        errors.push(
          `line ${index + 1}: prevHash mismatch (expected ${expectedPrevHash}, got ${entry.prevHash})`,
        );
      }
    }

    if (entry.eventHash !== computedHash) {
      if (inRange) {
        errors.push(
          `line ${index + 1}: eventHash mismatch (expected ${computedHash}, got ${entry.eventHash})`,
        );
      }
    }

    expectedPrevHash = entry.eventHash;
    lastHash = entry.eventHash;
    if (inRange) {
      checked += 1;
    }
  });

  return {
    ok: errors.length === 0,
    checked,
    errors,
    lastHash,
    since,
  };
};
