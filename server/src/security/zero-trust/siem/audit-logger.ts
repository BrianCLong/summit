export type SecurityEvent = {
  type: string;
  tenantId: string;
  action: string;
  outcome: 'allow' | 'deny';
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

export interface ZeroTrustAuditLogger {
  log(event: SecurityEvent): Promise<void>;
}

class NoopAuditLogger implements ZeroTrustAuditLogger {
  async log(): Promise<void> {
    return undefined;
  }
}

export function createZeroTrustAuditLogger(): ZeroTrustAuditLogger {
  return new NoopAuditLogger();
}
