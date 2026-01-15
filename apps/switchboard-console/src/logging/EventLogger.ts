import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { EventRecord } from '../types';

export class EventLogger {
  private readonly eventsPath: string;

  constructor(private readonly sessionDir: string) {
    this.eventsPath = path.join(this.sessionDir, 'events.jsonl');
  }

  async init(): Promise<void> {
    await mkdir(this.sessionDir, { recursive: true });
  }

  async log(event: EventRecord): Promise<void> {
    await appendFile(this.eventsPath, `${JSON.stringify(event)}\n`);
  }

  get path(): string {
    return this.eventsPath;
  }
}
