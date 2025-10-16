import { MigrationRunner, MigrationValidationError } from '../src/runner.js';
import { InMemoryStateStore } from '../src/state/in-memory-state-store.js';
import type { DatabaseAdapter } from '../src/adapters/base-adapter.js';
import type { MigrationDefinition, MigrationMeta } from '../src/types.js';

class NoopAdapter implements DatabaseAdapter<string> {
  public readonly dialect = 'test';
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async beginTransaction(): Promise<string> {
    return 'tx';
  }
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
  async runInTransaction<R>(callback: (transaction: string) => Promise<R>): Promise<R> {
    return callback('tx');
  }
  async ensureSafety(meta: MigrationMeta): Promise<void> {
    void meta;
  }
}

describe('Migration validation', () => {
  it('throws when rollback handler missing', async () => {
    const runner = new MigrationRunner({ adapter: new NoopAdapter(), stateStore: new InMemoryStateStore() });
    const invalid = { id: '001', up: async () => undefined } as unknown as MigrationDefinition;

    await expect(runner.apply([invalid])).rejects.toThrow(MigrationValidationError);
  });
});
