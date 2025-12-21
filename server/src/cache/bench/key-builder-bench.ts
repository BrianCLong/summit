import { performance } from 'node:perf_hooks';
import { buildDeterministicCacheKey } from '../cacheKeyBuilder.js';

function run(iterations: number) {
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    buildDeterministicCacheKey('bench', { tenant: 'demo', index: i, payload: { nested: true } });
  }
  const end = performance.now();
  const durationMs = end - start;
  console.log(`Ran ${iterations} iterations in ${durationMs.toFixed(2)}ms (${(durationMs / iterations).toFixed(6)} ms/op)`);
}

run(50_000);
