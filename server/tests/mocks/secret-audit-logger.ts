// Mock for SecretAuditLogger - ESM compatible
export interface SecretAuditEvent {
  provider: string;
  reference: string;
  cached: boolean;
  rotated: boolean;
  success: boolean;
  message?: string;
}

export class SecretAuditLogger {
  private logPath: string;

  constructor(logPath: string) {
    this.logPath = logPath;
  }

  record(_event: SecretAuditEvent): void {}
}

export default SecretAuditLogger;
