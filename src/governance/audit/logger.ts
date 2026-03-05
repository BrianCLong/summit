import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface AuditLogEntry {
  decision: any;
  previousHash: string;
  hash: string;
}

export class AuditLogger {
  private logFile: string;
  private lastHash: string = '';

  constructor(logFile: string) {
    this.logFile = logFile;
    if (fs.existsSync(this.logFile)) {
      const content = fs.readFileSync(this.logFile, 'utf-8');
      const lines = content.trim().split('\n');
      if (lines.length > 0) {
        try {
          const lastEntry = JSON.parse(lines[lines.length - 1]);
          this.lastHash = lastEntry.hash;
        } catch (e) {
          this.lastHash = '';
        }
      }
    }
  }

  log(decision: any) {
    const data = JSON.stringify(decision);
    const hash = crypto.createHash('sha256').update(this.lastHash + data).digest('hex');
    const entry: AuditLogEntry = {
      decision,
      previousHash: this.lastHash,
      hash
    };
    this.lastHash = hash;
    fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    return hash;
  }
}
