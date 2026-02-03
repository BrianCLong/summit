import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { GraphDetector } from '../GraphDetector.js';
import type { Driver } from 'neo4j-driver';

const recordWith = (values: Record<string, number>) => ({
  get: (key: string) => ({
    toNumber: () => values[key] ?? 0,
  }),
});

describe('GraphDetector', () => {
  it('should detect coordinated cliques', async () => {
    const run = jest.fn().mockResolvedValueOnce({
      records: [recordWith({ internalInteractions: 30, actorCount: 6 })],
    });
    const close = jest.fn().mockResolvedValue(undefined);
    const detector = new GraphDetector({
      session: jest.fn(() => ({ run, close })),
    } as unknown as Driver);

    const result = await detector.detectCoordinatedCliques(['u1', 'u2', 'u3', 'u4', 'u5', 'u6']);
    expect(result.isAnomalous).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
    expect(run).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('should analyze influence cascade', async () => {
    const run = jest.fn()
      .mockResolvedValueOnce({ records: [recordWith({ depth: 5 })] })
      .mockResolvedValueOnce({ records: [recordWith({ breadth: 100 })] });
    const close = jest.fn().mockResolvedValue(undefined);
    const detector = new GraphDetector({
      session: jest.fn(() => ({ run, close })),
    } as unknown as Driver);

    const metrics = await detector.analyzeInfluenceCascade('post1');
    expect(metrics.depth).toBe(5);
    expect(metrics.breadth).toBe(100);
    expect(run).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
