import type { AuditLogEvent } from 'common-types';
import { AppendOnlyAuditLog } from 'prov-ledger';

export class AuditBus {
  private readonly log: AppendOnlyAuditLog;

  constructor(retentionDays = 365) {
    this.log = new AppendOnlyAuditLog(retentionDays);
  }

  emit(event: AuditLogEvent): void {
    this.log.append({ ...event, ts: event.ts ?? new Date().toISOString() });
  }

  query(filter: Parameters<AppendOnlyAuditLog['query']>[0], options?: Parameters<AppendOnlyAuditLog['query']>[1]) {
    return this.log.query(filter, options);
  }

  integrityOk(): boolean {
    return this.log.verifyIntegrity();
  }
}
