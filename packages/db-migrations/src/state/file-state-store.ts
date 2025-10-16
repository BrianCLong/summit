import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { MigrationRecord, MigrationStateStore } from '../types.js';

interface PersistedState {
  readonly records: MigrationRecord[];
}

export interface FileStateStoreOptions {
  readonly filePath: string;
}

export class FileStateStore implements MigrationStateStore {
  private inMemory: MigrationRecord[] = [];

  constructor(private readonly options: FileStateStoreOptions) {}

  async init(): Promise<void> {
    try {
      const content = await fs.readFile(this.options.filePath, 'utf8');
      const parsed = JSON.parse(content) as PersistedState;
      this.inMemory = parsed.records ?? [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.persist();
      } else {
        throw error;
      }
    }
  }

  async listApplied(): Promise<MigrationRecord[]> {
    return [...this.inMemory].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
  }

  async markApplied(record: MigrationRecord): Promise<void> {
    this.inMemory = this.inMemory.filter((existing) => existing.id !== record.id).concat({
      ...record,
      appliedAt: record.appliedAt ?? new Date().toISOString(),
    });
    await this.persist();
  }

  async markReverted(id: string): Promise<void> {
    this.inMemory = this.inMemory.filter((record) => record.id !== id);
    await this.persist();
  }

  async withLock<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  }

  private async persist(): Promise<void> {
    const directory = dirname(this.options.filePath);
    await mkdir(directory, { recursive: true });
    const payload: PersistedState = { records: this.inMemory };
    await fs.writeFile(this.options.filePath, JSON.stringify(payload, null, 2), 'utf8');
  }
}
