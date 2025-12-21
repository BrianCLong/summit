import * as fs from 'fs';
import * as path from 'path';
import type { Logger } from 'pino';
import pino from 'pino';

export interface SecretAuditEvent {
  provider: string;
  reference: string;
  cached: boolean;
  rotated: boolean;
  success: boolean;
  message?: string;
}

export class SecretAuditLogger {
  private logger: Logger;

  constructor(private logPath: string) {
    const directory = path.dirname(logPath);
    fs.mkdirSync(directory, { recursive: true });
    this.logger = pino({ name: 'secret-audit', level: 'info' }, pino.destination({ dest: logPath, mkdir: true }));
  }

  record(event: SecretAuditEvent): void {
    this.logger.info(
      {
        reference: event.reference,
        provider: event.provider,
        cached: event.cached,
        rotated: event.rotated,
        success: event.success,
        message: event.message,
        timestamp: new Date().toISOString(),
      },
      'secret.access',
    );
  }
}
