import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { TraceRecord } from './trace_record.js';

export class TraceStore {
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = join(baseDir, '.summit/agent-trace/records');
  }

  saveRecord(record: TraceRecord): void {
    const revision = record.vcs?.revision || 'unknown';
    const dir = join(this.baseDir, revision);
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, `${record.id}.json`);
    writeFileSync(filePath, JSON.stringify(record, null, 2));
  }

  loadRecords(revision: string): TraceRecord[] {
    const dir = join(this.baseDir, revision);
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  }

  listRevisions(): string[] {
    if (!existsSync(this.baseDir)) return [];
    return readdirSync(this.baseDir);
  }
}
