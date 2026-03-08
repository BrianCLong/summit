import { withDegraded } from '../../server/testing/degraded-comms';

describe('degraded comms harness', () => {
  it('adds latency and drops calls probabilistically', async () => {
    const fn = async (x: number) => x + 1;
    const wrapped = withDegraded(fn, {
      dropRate: 0.2,
      minLatencyMs: 10,
      jitterMs: 10,
    });

    let ok = 0,
      dropped = 0;
    const start = Date.now();
    for (let i = 0; i < 25; i++) {
      try {
        await wrapped(i);
        ok++;
      } catch (e: any) {
        if (e?.code === 'DEGRADED_DROP') dropped++;
        else throw e;
      }
    }
    const elapsed = Date.now() - start;
    expect(ok + dropped).toBe(25);
    expect(dropped).toBeGreaterThan(0);
    expect(elapsed).toBeGreaterThanOrEqual(10); // at least one latency tick
  });
});
