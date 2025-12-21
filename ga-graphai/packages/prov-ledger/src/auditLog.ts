import { createHash } from 'node:crypto';
import type {
  AuditLogEvent,
  AuditQueryFilter,
  AuditQueryOptions,
  AuditQueryResult,
} from 'common-types';

interface StoredAuditEvent extends AuditLogEvent {
  hash: string;
  previousHash?: string;
}

function sanitizeDetails(details: Record<string, unknown> | undefined) {
  if (!details) return undefined;
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') {
      if (/\b\d{3}-\d{2}-\d{4}\b/.test(value) || /@/.test(value)) {
        redacted[key] = '***redacted***';
        continue;
      }
    }
    redacted[key] = value;
  }
  return redacted;
}

function computeHash(event: AuditLogEvent & { previousHash?: string }) {
  const hash = createHash('sha256');
  hash.update(event.tenant ?? '');
  hash.update(event.action);
  hash.update(event.actor ?? '');
  hash.update(event.resource ?? '');
  hash.update(event.region ?? '');
  hash.update(event.trace_id ?? '');
  hash.update(event.ts ?? '');
  hash.update(JSON.stringify(event.details ?? {}));
  if (event.previousHash) hash.update(event.previousHash);
  return hash.digest('hex');
}

export class AppendOnlyAuditLog {
  private readonly events: StoredAuditEvent[] = [];
  private readonly retentionMs: number;

  constructor(retentionDays = 365) {
    this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  }

  append(event: AuditLogEvent): StoredAuditEvent {
    const sanitized = { ...event, details: sanitizeDetails(event.details) };
    const previousHash = this.events.findLast(() => true)?.hash;
    const stored: StoredAuditEvent = {
      ...sanitized,
      ts: sanitized.ts ?? new Date().toISOString(),
      previousHash,
      hash: '',
    };
    stored.hash = computeHash(stored);
    this.events.push(stored);
    this.enforceRetention();
    return stored;
  }

  private enforceRetention() {
    const cutoff = Date.now() - this.retentionMs;
    while (this.events[0] && new Date(this.events[0].ts ?? 0).getTime() < cutoff) {
      this.events.shift();
    }
  }

  query(filter: AuditQueryFilter, options: AuditQueryOptions = {}): AuditQueryResult {
    const pageSize = options.limit ?? 50;
    const start = options.offset ?? 0;
    let results = this.events.filter((event) => {
      if (filter.tenant && event.tenant !== filter.tenant) return false;
      if (filter.actions && !filter.actions.includes(event.action)) return false;
      if (filter.actors && !filter.actors.includes(event.actor ?? '')) return false;
      if (filter.resource && event.resource !== filter.resource) return false;
      return true;
    });

    if (options.stepUpRequired && !options.stepUpSatisfied) {
      throw new Error('Step-up authentication required for this export');
    }

    const slice = results.slice(start, start + pageSize);
    return {
      filter,
      events: slice,
      timeline: slice.map((event) => ({ ts: event.ts ?? '', action: event.action })),
      anomalies: [],
      correlations: [],
    };
  }

  verifyIntegrity(): boolean {
    return this.events.every((event, index) => {
      const expectedPrev = index === 0 ? undefined : this.events[index - 1].hash;
      if (expectedPrev !== event.previousHash) return false;
      const recalculated = computeHash({ ...event });
      return recalculated === event.hash;
    });
  }
}

export type { StoredAuditEvent };
