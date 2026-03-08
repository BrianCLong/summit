export interface ReplayRecord {
  runId: string;
  timestamp: number;
  bundleUrl: string;
  isVerified: boolean;
}

export class ReplayIndex {
  private records: ReplayRecord[] = [];

  addRecord(record: Omit<ReplayRecord, 'isVerified'>) {
    this.records.push({ ...record, isVerified: false });
  }

  verifyAll() {
    this.records.forEach(r => r.isVerified = true);
  }

  getRecords() {
    return this.records;
  }
}
