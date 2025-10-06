import { describe, it, expect } from 'vitest';
import { Scheduler } from '../src/scheduler';

describe('Scheduler', () => {
  it('allocates and invokes', async () => {
    const s = new Scheduler();
    const sess = await s.allocate('github');
    const out = await s.invoke(sess.id, 'ping', { x: 1 });
    expect(out.ok).toBe(true);
    await s.release(sess.id);
  });
});
