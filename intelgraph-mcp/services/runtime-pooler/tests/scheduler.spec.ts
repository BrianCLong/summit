import { describe, it, expect } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync } from 'fs';

describe('Scheduler', () => {
  it(
    'allocates and invokes',
    async () => {
    const snapshotDir = join(
      tmpdir(),
      `intelgraph-fc-snapshots-${Date.now().toString(36)}`,
    );
    process.env.FC_MOCK = '1';
    process.env.FC_SNAPSHOT_DIR = snapshotDir;
    process.env.REPLAY_ENGINE_URL = 'http://127.0.0.1:54321';
    process.env.REPLAY_REQUEST_TIMEOUT_MS = '100';

    const { Scheduler } = await import('../src/scheduler');
    const s = new Scheduler();
    const sess = await s.allocate('github');
    const out = await s.invoke(sess.id, 'ping', { x: 1 });
    expect(out.ok).toBe(true);
    await s.release(sess.id);

    delete process.env.FC_MOCK;
    delete process.env.FC_SNAPSHOT_DIR;
    delete process.env.REPLAY_ENGINE_URL;
    delete process.env.REPLAY_REQUEST_TIMEOUT_MS;
    rmSync(snapshotDir, { recursive: true, force: true });
    },
    20000,
  );
});
