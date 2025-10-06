import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { FileStateStore } from '../src/state/file-state-store.js';
import { InMemoryStateStore } from '../src/state/in-memory-state-store.js';

describe('State stores', () => {
  it('serializes and reloads records from disk', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'state-store-'));
    const file = join(directory, 'state.json');
    const store = new FileStateStore({ filePath: file });
    await store.init();
    await store.markApplied({
      id: '1',
      version: '1',
      checksum: 'abc',
      appliedAt: new Date().toISOString(),
      durationMs: 1,
    });
    await store.markReverted('missing');

    const records = await store.listApplied();
    expect(records).toHaveLength(1);

    const next = new FileStateStore({ filePath: file });
    await next.init();
    expect(await next.listApplied()).toHaveLength(1);
  });

  it('guards concurrent locks in memory store', async () => {
    const store = new InMemoryStateStore();
    await store.init();
    const order: number[] = [];

    await Promise.all([
      store.withLock(async () => {
        order.push(1);
      }),
      store.withLock(async () => {
        order.push(2);
      }),
    ]);

    expect(order).toEqual([1, 2]);
  });
});
