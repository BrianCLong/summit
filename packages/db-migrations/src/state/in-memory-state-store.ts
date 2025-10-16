import { randomUUID } from 'node:crypto';
import type { MigrationRecord, MigrationStateStore } from '../types.js';

export class InMemoryStateStore implements MigrationStateStore {
  private readonly records = new Map<string, MigrationRecord>();
  private lockPromise: Promise<unknown> | null = null;

  async init(): Promise<void> {
    // no-op
  }

  async listApplied(): Promise<MigrationRecord[]> {
    return Array.from(this.records.values()).sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
  }

  async markApplied(record: MigrationRecord): Promise<void> {
    this.records.set(record.id, { ...record, appliedAt: record.appliedAt ?? new Date().toISOString() });
  }

  async markReverted(id: string): Promise<void> {
    this.records.delete(id);
  }

  async withLock<T>(callback: () => Promise<T>): Promise<T> {
    if (this.lockPromise) {
      await this.lockPromise;
    }
    let resolveLock: ((value: unknown) => void) | undefined;
    this.lockPromise = new Promise((resolve) => {
      resolveLock = resolve;
    });
    try {
      return await callback();
    } finally {
      resolveLock?.(randomUUID());
      this.lockPromise = null;
    }
  }
}
