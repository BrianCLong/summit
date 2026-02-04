import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

// Mock ingest function (simulating a network call or DB write)
async function simulateIngest(payload: any) {
  const start = performance.now();
  // Simulate 20-150ms latency
  const delay = 20 + Math.random() * 130;
  await new Promise(resolve => setTimeout(resolve, delay));
  const end = performance.now();
  return end - start;
}

async function runBenchmark() {
  console.log('Starting Ingest Benchmark...');
  const iterations = 100;
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const payload = { event: 'webhook', id: i, timestamp: Date.now() };
    const latency = await simulateIngest(payload);
    latencies.push(latency);
    process.stdout.write('.');
  }
  console.log('\nBenchmark complete.');

  // Calculate p95
  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95 = latencies[p95Index];
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  const metrics = {
    benchmark: 'ingest_webhook_latency',
    iterations,
    p95_ms: Number(p95.toFixed(2)),
    avg_ms: Number(avg.toFixed(2)),
    timestamp: new Date().toISOString()
  };

  console.log('Results:', metrics);

  const outputPath = path.resolve(process.cwd(), 'metrics.json');
  fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
  console.log(`Metrics written to ${outputPath}`);

  // Target assumed 200ms
  if (p95 > 200) {
    console.error('FAIL: p95 latency > 200ms');
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
