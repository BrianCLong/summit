import { performance } from 'perf_hooks';

/**
 * Webhook Ingest Latency Harness
 *
 * Simulates high-throughput webhook ingestion and verifies p95 latency.
 * Usage: tsx ingest/webhooks/latency_harness.ts
 */

const TARGET_P95_MS = 75;
const ITERATIONS = 1000;

interface WebhookPayload {
  eventId: string;
  source: string;
  payload: Record<string, any>;
  timestamp: number;
}

// Simulated ingest function (replace with actual API call)
async function ingestWebhook(payload: WebhookPayload): Promise<void> {
  // Simulate network jitter and processing
  const processingTime = 20 + Math.random() * 50; // 20-70ms baseline

  // Simulate occasional spike
  if (Math.random() > 0.98) {
      await new Promise(resolve => setTimeout(resolve, processingTime + 100));
  } else {
      await new Promise(resolve => setTimeout(resolve, processingTime));
  }
}

async function runBenchmark() {
  console.log(`Starting Webhook Latency Benchmark (${ITERATIONS} iterations)...`);
  const latencies: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const payload: WebhookPayload = {
      eventId: `evt-${i}`,
      source: 'benchmark',
      payload: { data: 'test' },
      timestamp: Date.now()
    };

    const start = performance.now();
    await ingestWebhook(payload);
    const end = performance.now();
    latencies.push(end - start);
  }

  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95 = latencies[p95Index];

  console.log(`Results:`);
  console.log(`  Min: ${latencies[0].toFixed(2)}ms`);
  console.log(`  Max: ${latencies[latencies.length - 1].toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);

  if (p95 > TARGET_P95_MS) {
    console.error(`FAIL: p95 latency ${p95.toFixed(2)}ms exceeds target ${TARGET_P95_MS}ms`);
    process.exit(1);
  } else {
    console.log(`PASS: p95 latency ${p95.toFixed(2)}ms within target.`);
  }
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
