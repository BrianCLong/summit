import axios from 'axios';
import { SoakTestHarness } from '../src/soak/SoakTestHarness.js';
import { Logger } from '../src/utils/Logger.js';

describe('SoakTestHarness', () => {
  const logger = new Logger('SoakTestHarnessTest');
  const client = axios.create({ baseURL: 'http://localhost' });

  it('executes the configured number of requests and respects error targets', async () => {
    const harness = new SoakTestHarness(client, logger);
    const result = await harness.run(
      {
        requestCount: 10,
        targetErrorRate: 0.1,
        concurrency: 2,
        payload: { query: '{}' },
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    );

    expect(result.totalRequests).toBe(10);
    expect(result.errorCount).toBe(0);
    expect(result.successCount).toBe(10);
    expect(result.passed).toBe(true);
    expect(result.errorRate).toBe(0);
    expect(result.averageLatency).toBeGreaterThanOrEqual(0);
  });

  it('injects chaos events and records resulting failures', async () => {
    const harness = new SoakTestHarness(client, logger);
    const result = await harness.run(
      {
        requestCount: 6,
        targetErrorRate: 0.2,
        concurrency: 1,
        payload: { query: '{}' },
        chaos: {
          latencySpikeEvery: 2,
          latencySpikeDelayMs: 1,
          dependencyDownEvery: 3,
        },
      },
      async (index) => {
        if (index === 4) {
          throw new Error('Intentional failure');
        }
      }
    );

    expect(result.totalRequests).toBe(6);
    expect(result.latencySpikesInjected).toBe(3);
    expect(result.dependencyDownInjected).toBe(2);
    expect(result.errorCount).toBeGreaterThanOrEqual(3);
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBe(result.errorCount);
  });
});
