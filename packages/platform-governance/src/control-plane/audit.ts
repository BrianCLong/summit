import { ToolCall } from './types.js';

export interface AuditRecord {
  id: string;
  timestamp: number;
  call: ToolCall;
  decision: {
    allowed: boolean;
    effect: string;
    reasons: string[];
    approvalRequired: boolean;
  };
}

export class AuditLog {
  private records: AuditRecord[] = [];

  append(record: AuditRecord): void {
    this.records.push(record);
  }

  latest(limit = 50): AuditRecord[] {
    return this.records.slice(-limit).reverse();
  }
}
