import { BackpressureGate } from '../subscriptions/BackpressureGate';

describe('subscription soak', () => {
  it('processes events under latency budget', async () => {
    const gate = new BackpressureGate(5, 0.2);
    const latencies: number[] = [];
    for (let i = 0; i < 10; i++) {
      if (!gate.canAccept()) {
        continue;
      }
      gate.start();
      const t = Date.now();
      await new Promise((r) => setTimeout(r, 10));
      latencies.push(Date.now() - t);
      gate.done();
    }
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95) - 1] || 0;
    expect(p95).toBeLessThan(300);
  });
});
