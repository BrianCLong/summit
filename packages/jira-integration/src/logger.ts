export interface AuditLogEntry {
  readonly timestamp: string;
  readonly action: string;
  readonly entityId?: string;
  readonly payload?: unknown;
  readonly status: 'success' | 'error';
  readonly message?: string;
}

export interface AuditLogger {
  record(entry: AuditLogEntry): void;
}

export class InMemoryAuditLogger implements AuditLogger {
  private readonly entries: AuditLogEntry[] = [];

  record(entry: AuditLogEntry): void {
    this.entries.push(entry);
  }

  getAll(): readonly AuditLogEntry[] {
    return this.entries;
  }
}

export class ConsoleAuditLogger implements AuditLogger {
  record(entry: AuditLogEntry): void {
    const serialized = JSON.stringify(entry);
    // eslint-disable-next-line no-console
    console.info(`[jira-audit] ${serialized}`);
  }
}

export const createAuditEntry = (
  action: string,
  status: AuditLogEntry['status'],
  details: Omit<AuditLogEntry, 'action' | 'status' | 'timestamp'> = {}
): AuditLogEntry => ({
  timestamp: new Date().toISOString(),
  action,
  status,
  ...details
});
