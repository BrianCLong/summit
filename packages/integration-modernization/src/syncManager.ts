import { randomUUID } from 'crypto';
import { QuarantineRecord, ReconciliationResult } from './types';

export type SyncRecord = {
  id: string;
  connectorId: string;
  token?: string;
  payloads: Record<string, unknown>[];
  fullResync?: boolean;
  startedAt: number;
  completedAt?: number;
};

export class SyncManager {
  private systemOfRecord: Map<string, string> = new Map();
  private lastTokens: Map<string, string> = new Map();
  private quarantine: QuarantineRecord[] = [];
  private timeline: Map<string, SyncRecord[]> = new Map();

  defineSystemOfRecord(objectType: string, connectorId: string) {
    this.systemOfRecord.set(objectType, connectorId);
  }

  incrementalSync(connectorId: string, token: string, payloads: Record<string, unknown>[]): SyncRecord {
    this.lastTokens.set(connectorId, token);
    const record = this.startRecord(connectorId, token, payloads, false);
    this.finishRecord(record);
    this.appendTimeline(connectorId, record);
    return record;
  }

  fullResync(connectorId: string, payloads: Record<string, unknown>[]): SyncRecord {
    const record = this.startRecord(connectorId, undefined, payloads, true);
    this.finishRecord(record);
    this.appendTimeline(connectorId, record);
    return record;
  }

  reconcile(
    connectorId: string,
    expected: Record<string, unknown>,
    actual: Record<string, unknown>,
    identityFields: string[]
  ): ReconciliationResult {
    const drift: Record<string, { expected: unknown; actual: unknown }> = {};
    const resolved: string[] = [];
    identityFields.forEach((field) => {
      if (expected[field] !== actual[field]) {
        drift[field] = { expected: expected[field], actual: actual[field] };
      } else {
        resolved.push(field);
      }
    });
    return { drift, resolved };
  }

  validatePayload(connectorId: string, payload: Record<string, unknown>, rules: ((payload: Record<string, unknown>) => boolean)[]) {
    for (const rule of rules) {
      const valid = rule(payload);
      if (!valid) {
        const record: QuarantineRecord = {
          connectorId,
          reason: 'validation_failed',
          payload,
          timestamp: Date.now()
        };
        this.quarantine.push(record);
        return false;
      }
    }
    return true;
  }

  quarantineRecords() {
    return [...this.quarantine];
  }

  timelineFor(connectorId: string) {
    return this.timeline.get(connectorId) ?? [];
  }

  private startRecord(
    connectorId: string,
    token: string | undefined,
    payloads: Record<string, unknown>[],
    fullResync: boolean
  ): SyncRecord {
    return {
      id: randomUUID(),
      connectorId,
      token,
      payloads,
      fullResync,
      startedAt: Date.now()
    };
  }

  private finishRecord(record: SyncRecord) {
    record.completedAt = Date.now();
  }

  private appendTimeline(connectorId: string, record: SyncRecord) {
    const existing = this.timeline.get(connectorId) ?? [];
    this.timeline.set(connectorId, [...existing, record]);
  }
}
