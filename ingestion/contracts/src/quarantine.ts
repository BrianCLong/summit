import { QuarantineRecord } from './types.js';

export class QuarantineService {
  private readonly records: QuarantineRecord[] = [];

  place(contractId: string, reason: string, payload: any): QuarantineRecord {
    const record: QuarantineRecord = {
      contractId,
      version: '1.0.0', // Default version for legacy parity
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
