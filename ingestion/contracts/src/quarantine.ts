import { QuarantineRecord } from './types.js';
import { AppendOnlyAuditLog } from './audit.js';

export class QuarantineService {
  private readonly quarantined: QuarantineRecord[] = [];

  constructor(private readonly audit: AppendOnlyAuditLog) {}

  place(
    contractId: string,
    reason: string,
    payloadSample: Record<string, unknown>,
  ): QuarantineRecord {
    const record: QuarantineRecord = {
      id: `quarantine-${crypto.randomUUID()}`,
      contractId,
      observedAt: new Date().toISOString(),
      reason,
      payloadSample,
    };
    this.quarantined.push(record);
    this.audit.record({ actor: 'quarantine', action: 'placed', details: { contractId, reason } });
    return record;
  }

  resolve(id: string, notes: string): QuarantineRecord | undefined {
    const record = this.quarantined.find((entry) => entry.id === id);
    if (!record) return undefined;
    if (!record.resolvedAt) {
      record.resolvedAt = new Date().toISOString();
      record.resolutionNotes = notes;
      this.audit.record({ actor: 'quarantine', action: 'resolved', details: { id, notes } });
    }
    return record;
  }

  list(): QuarantineRecord[] {
    return [...this.quarantined];
  }
}
