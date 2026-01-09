import { promises as fs } from 'fs';
import path from 'path';
import type { AuditEvent } from '../types.js';

export interface AuditLog {
  append(
    event: Omit<AuditEvent, 'sequence' | 'timestamp'> & {
      sequence?: number;
      timestamp?: string;
    },
  ): Promise<void>;
  readAll(): Promise<AuditEvent[]>;
}

export class JsonlAuditLog implements AuditLog {
  private readonly filePath: string;
  private nextSequence = 1;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async append(
    event: Omit<AuditEvent, 'sequence' | 'timestamp'> & {
      sequence?: number;
      timestamp?: string;
    },
  ): Promise<void> {
    const entry: AuditEvent = {
      sequence: event.sequence ?? this.nextSequence++,
      timestamp: event.timestamp ?? new Date().toISOString(),
      runId: event.runId,
      type: event.type,
      payload: event.payload,
    };

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  async readAll(): Promise<AuditEvent[]> {
    try {
      const content = await fs.readFile(this.filePath);
      const text = String(content);
      return text
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .map((line: string) => JSON.parse(line) as AuditEvent);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
