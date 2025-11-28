import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export class AppendOnlyAuditLog {
  private readonly file: string;

  constructor(filename = 'audit.log') {
    this.file = join(process.cwd(), filename);
    mkdirSync(process.cwd(), { recursive: true });
  }

  write(event: Record<string, unknown>): void {
    const entry = { ...event, at: new Date().toISOString() };
    appendFileSync(this.file, `${JSON.stringify(entry)}\n`);
  }
}
