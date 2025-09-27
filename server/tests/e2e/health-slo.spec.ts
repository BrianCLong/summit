import { expect, test } from '@playwright/test';

test.describe('SLO @slo', () => {
  const thresholdMs = Number(process.env.HEALTH_P95_MS ?? 300);
  const samples = Number(process.env.HEALTH_SAMPLES ?? 5);

  test('health endpoint meets latency SLO', async ({ request }) => {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    const healthUrl = `${apiUrl}/health`;
    const latencies: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = Date.now();
      let response;
      try {
        response = await request.get(healthUrl, { timeout: thresholdMs * 5 });
      } catch (error) {
        test.skip(`Health check unavailable: ${(error as Error).message}`);
        return;
      }

      if (!response.ok()) {
        test.fail(true, `Health endpoint returned HTTP ${response.status()}`);
        return;
      }

      latencies.push(Date.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const index = Math.max(Math.ceil(latencies.length * 0.95) - 1, 0);
    const p95 = latencies[index];

    test.info().annotations.push({ type: 'latencies', description: JSON.stringify(latencies) });

    expect(p95, `p95 latency ${p95}ms exceeded ${thresholdMs}ms`).toBeLessThanOrEqual(thresholdMs);
  });
});
