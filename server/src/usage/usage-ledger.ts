export interface UsageRecord {
  operationName: string;
  timestamp: Date;
  requestSizeBytes: number;
  tenantId?: string;
  userId?: string;
  success: boolean;
  statusCode?: number;
  errorCategory?: string;
}

export interface UsageLedger {
  recordUsage(record: UsageRecord): void;
}

export class InMemoryUsageLedger implements UsageLedger {
  private records: UsageRecord[] = [];

  recordUsage(record: UsageRecord): void {
    this.records.push({ ...record });
  }

  getRecords(): UsageRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}

export const usageLedger = new InMemoryUsageLedger();
