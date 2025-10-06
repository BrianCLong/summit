import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { MigrationRunner } from '../src/runner.js';
import { InMemoryStateStore } from '../src/state/in-memory-state-store.js';
import { FileStateStore } from '../src/state/file-state-store.js';
import type { DatabaseAdapter } from '../src/adapters/base-adapter.js';
import type { MigrationDefinition, MigrationMeta } from '../src/types.js';

class FakeAdapter implements DatabaseAdapter<string> {
  public readonly dialect = 'test';
  public readonly executed: string[] = [];
  public readonly rolledBack: string[] = [];
  public readonly ensureSafetyCalls: string[] = [];
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async beginTransaction(): Promise<string> {
    if (!this.connected) {
      throw new Error('not connected');
    }
    return `tx-${Date.now()}`;
  }

  async commit(transaction: string): Promise<void> {
    this.executed.push(transaction);
  }

  async rollback(transaction: string): Promise<void> {
    this.rolledBack.push(transaction);
  }

  async runInTransaction<R>(callback: (transaction: string) => Promise<R>): Promise<R> {
    const tx = await this.beginTransaction();
    try {
      const result = await callback(tx);
      await this.commit(tx);
      return result;
    } catch (error) {
      await this.rollback(tx);
      throw error;
    }
  }

  async ensureSafety(meta: MigrationMeta): Promise<void> {
    this.ensureSafetyCalls.push(meta.id);
  }
}

const createMigration = (id: string, behaviour?: { fail?: boolean }) => {
  const up = jest.fn(async () => {
    if (behaviour?.fail) {
      throw new Error(`fail-${id}`);
    }
  });
  const down = jest.fn(async () => undefined);
  return { id, up, down } satisfies MigrationDefinition;
};

describe('MigrationRunner', () => {
  it('applies migrations and stores state', async () => {
    const adapter = new FakeAdapter();
    const stateStore = new InMemoryStateStore();
    const runner = new MigrationRunner({ adapter, stateStore });
    const migrationA = createMigration('001');
    const migrationB = createMigration('002');

    const result = await runner.apply([migrationA, migrationB]);

    expect(result).toHaveLength(2);
    expect(migrationA.up).toHaveBeenCalled();
    expect(migrationB.up).toHaveBeenCalled();
    const applied = await stateStore.listApplied();
    expect(applied.map((record) => record.id)).toEqual(['001', '002']);
    expect(adapter.ensureSafetyCalls).toEqual(['001', '002']);
  });

  it('rolls back previously executed migrations on failure', async () => {
    const adapter = new FakeAdapter();
    const stateStore = new InMemoryStateStore();
    const runner = new MigrationRunner({ adapter, stateStore });
    const migrationA = createMigration('001');
    const migrationB = createMigration('002', { fail: true });

    await expect(runner.apply([migrationA, migrationB])).rejects.toThrow('fail-002');
    expect(migrationA.down).toHaveBeenCalledTimes(1);
    expect(migrationB.down).toHaveBeenCalledTimes(1);
    expect((await stateStore.listApplied())).toHaveLength(0);
  });

  it('supports dry run mode without executing migrations', async () => {
    const adapter = new FakeAdapter();
    const stateStore = new InMemoryStateStore();
    const runner = new MigrationRunner({ adapter, stateStore });
    const migrationA = createMigration('001');

    await runner.apply([migrationA], { dryRun: true });

    expect(migrationA.up).not.toHaveBeenCalled();
    expect(await stateStore.listApplied()).toHaveLength(0);
  });

  it('invokes backup hooks during rollback', async () => {
    const adapter = new FakeAdapter();
    const stateStore = new InMemoryStateStore();
    const runner = new MigrationRunner({ adapter, stateStore });
    const backup = {
      restore: jest.fn(async () => undefined),
      metadata: { snapshot: '123' },
    };
    const beforeApply = jest.fn(async () => backup);
    const onFailure = jest.fn(async () => undefined);
    const migration = createMigration('001', { fail: true });

    await expect(
      runner.apply([migration], {
        backupProvider: {
          beforeApply,
          onFailure,
          afterSuccess: jest.fn(),
        },
      })
    ).rejects.toThrow('fail-001');

    expect(beforeApply).toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalled();
    expect(backup.restore).toHaveBeenCalled();
  });

  it('persists state on disk via FileStateStore', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'migrations-'));
    const statePath = join(directory, 'state.json');
    const stateStore = new FileStateStore({ filePath: statePath });
    const adapter = new FakeAdapter();
    const runner = new MigrationRunner({ adapter, stateStore });
    const migration = createMigration('001');

    await runner.apply([migration]);
    const stored = JSON.parse(await fs.readFile(statePath, 'utf8')) as { records?: Array<{ id: string }> };
    expect(stored.records?.length).toBe(1);
    expect(stored.records?.[0]?.id).toBe('001');
  });

  it('supports applying to a target migration', async () => {
    const adapter = new FakeAdapter();
    const stateStore = new InMemoryStateStore();
    const runner = new MigrationRunner({ adapter, stateStore });
    const migrationA = createMigration('001');
    const migrationB = createMigration('002');

    const result = await runner.apply([migrationA, migrationB], { target: '001' });

    expect(result).toHaveLength(1);
    expect(migrationB.up).not.toHaveBeenCalled();
  });

  it('emits progress events when provided', async () => {
    const adapter = new FakeAdapter();
    const stateStore = new InMemoryStateStore();
    const runner = new MigrationRunner({ adapter, stateStore });
    const migration = createMigration('001');
    const events: string[] = [];

    await runner.apply([migration], {
      onProgress: (event) => {
        events.push(event.type);
      },
    });

    expect(events).toContain('plan');
    expect(events).toContain('apply:start');
    expect(events).toContain('apply:success');
  });

  it('calls backup success hooks when migrations succeed', async () => {
    const adapter = new FakeAdapter();
    const stateStore = new InMemoryStateStore();
    const runner = new MigrationRunner({ adapter, stateStore });
    const backup = {
      restore: jest.fn(async () => undefined),
    };
    const afterSuccess = jest.fn(async () => undefined);
    const migration = createMigration('001');

    await runner.apply([migration], {
      backupProvider: {
        beforeApply: async () => backup,
        afterSuccess,
      },
    });

    expect(afterSuccess).toHaveBeenCalled();
    expect(backup.restore).not.toHaveBeenCalled();
  });

  it('verifyRollback injects failure and returns resulting state', async () => {
    const adapter = new FakeAdapter();
    const stateStore = new InMemoryStateStore();
    const runner = new MigrationRunner({ adapter, stateStore });
    const migration = createMigration('001');

    const state = await runner.verifyRollback([migration], { failAt: '001' });

    expect(state).toHaveLength(0);
  });
});
