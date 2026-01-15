// Mock for SecretAuditLogger
export interface SecretAuditEvent {
  provider: string;
  reference: string;
  cached: boolean;
  rotated: boolean;
  success: boolean;
  message?: string;
}

export class SecretAuditLogger {
  constructor(_logPath: string) {}
  record(_event: SecretAuditEvent): void {}
}
