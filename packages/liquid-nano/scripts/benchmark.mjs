#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { createRuntime } from '../dist/index.js';

const totalEvents = Number(process.argv.find((arg) => arg.startsWith('--events='))?.split('=')[1] ?? 5000);
const concurrency = Number(process.argv.find((arg) => arg.startsWith('--concurrency='))?.split('=')[1] ?? 4);

const runtime = createRuntime({
  config: {
    id: 'benchmark',
    environment: 'dev',
    telemetry: { mode: 'console', sampleRate: 0, endpoint: undefined },
    security: { allowDynamicPlugins: true, redactFields: [], validateSignatures: false },
    performance: { maxConcurrency: concurrency, highWatermark: totalEvents, adaptiveThrottling: true },
    auditTrail: { enabled: false, sink: 'memory' }
  }
});

runtime.registerPlugin({
  name: 'noop',
  version: '0.1.0',
  supportsEvent: () => true,
  onEvent: async () => {
    // simulate CPU work
    const start = performance.now();
    while (performance.now() - start < 0.1) {
      // busy loop for 0.1ms
    }
  }
});

await runtime.start();

const start = performance.now();
for (let i = 0; i < totalEvents; i += 1) {
  await runtime.emit({ type: 'benchmark', payload: { seq: i }, timestamp: new Date() });
}
const duration = performance.now() - start;
const throughput = (totalEvents / duration) * 1000;

console.log(`Events processed: ${totalEvents}`);
console.log(`Throughput: ${throughput.toFixed(2)} events/sec`);
console.log(`Elapsed: ${duration.toFixed(2)} ms`);
