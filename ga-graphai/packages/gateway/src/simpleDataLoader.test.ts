import { describe, expect, it, vi } from 'vitest';
import { SimpleDataLoader } from './index.js';

describe('SimpleDataLoader', () => {
  it('expires cache entries after TTL', async () => {
    vi.useFakeTimers();
    const batchFn = vi.fn(async (keys: readonly string[]) => keys.map((key) => `${key}-value`));
    const loader = new SimpleDataLoader(batchFn, { cacheTtlMs: 10 });

    const first = await loader.load('a');
    expect(first).toBe('a-value');
    expect(batchFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(11);

    const second = await loader.load('a');
    expect(second).toBe('a-value');
    expect(batchFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('uses deterministic ordering by default and preserves arrival order when requested', async () => {
    const deterministicCalls: string[][] = [];
    const deterministicLoader = new SimpleDataLoader(async (keys: readonly string[]) => {
      deterministicCalls.push([...keys]);
      return keys.map((key) => key);
    });

    await Promise.all([
      deterministicLoader.load('b'),
      deterministicLoader.load('a'),
      deterministicLoader.load('b'),
    ]);

    expect(deterministicCalls[0]).toEqual(['a', 'b']);

    const nondeterministicCalls: string[][] = [];
    const nondeterministicLoader = new SimpleDataLoader(
      async (keys: readonly string[]) => {
        nondeterministicCalls.push([...keys]);
        return keys.map((key) => key);
      },
      { mode: 'non-deterministic' },
    );

    await Promise.all([nondeterministicLoader.load('b'), nondeterministicLoader.load('a')]);

    expect(nondeterministicCalls[0]).toEqual(['b', 'a']);
  });

  it('enforces batching thresholds and signals backpressure', async () => {
    const batchedCalls: string[][] = [];
    const loader = new SimpleDataLoader(
      async (keys: readonly string[]) => {
        batchedCalls.push([...keys]);
        return keys.map((key) => key);
      },
      { batchMaxSize: 1, maxPending: 1, onBackpressure: 'throw' },
    );

    const first = loader.load('one');
    await expect(async () => loader.load('two')).rejects.toThrow('DATALOADER_BACKPRESSURE');
    await first;

    expect(batchedCalls.length).toBeGreaterThanOrEqual(1);
    expect(batchedCalls.every((batch) => batch.length <= 1)).toBe(true);
  });
});
