import { QuarantineRecord } from './types.js';

export class QuarantineRegistry {
  private readonly records: QuarantineRecord[] = [];

  quarantine(contractId: string, version: string, reason: string): QuarantineRecord {
    const record: QuarantineRecord = {
      contractId,
      version,
      reason,
      at: new Date().toISOString()
    };
    this.records.push(record);
    return record;
  }

  resolve(contractId: string, version: string, resolutionNote: string): QuarantineRecord | undefined {
    const entry = this.records.find(
      (record) => record.contractId === contractId && record.version === version && !record.releasedAt
    );
    if (entry) {
      entry.releasedAt = new Date().toISOString();
      entry.resolutionNote = resolutionNote;
    }
    return entry;
  }

  active(): QuarantineRecord[] {
    return this.records.filter((record) => !record.releasedAt);
  }
}
