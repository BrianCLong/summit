
import { performance } from 'perf_hooks';

// Mock DB client
const mockPg = {
  query: async (query: string, values: any[]) => {
    // Simulate network latency/processing
    return new Promise(resolve => setTimeout(resolve, 5));
  }
};

async function sequentialInsert(iocs: any[]) {
  const start = performance.now();
  for (const ioc of iocs) {
    await mockPg.query(
      'INSERT INTO iocs (type, value, source, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT DO NOTHING',
      [ioc.type, ioc.value, ioc.source]
    );
  }
  return performance.now() - start;
}

async function batchedInsert(iocs: any[]) {
  const start = performance.now();
  const chunkSize = 100;
  for (let i = 0; i < iocs.length; i += chunkSize) {
    const chunk = iocs.slice(i, i + chunkSize);
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const ioc of chunk) {
      values.push(ioc.type, ioc.value, ioc.source);
      placeholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, NOW(), NOW())`,
      );
      paramIndex += 3;
    }

    await mockPg.query(
      `INSERT INTO iocs (type, value, source, created_at, updated_at)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT DO NOTHING`,
      values,
    );
  }
  return performance.now() - start;
}

async function runBenchmark() {
  const count = 500;
  const iocs = Array.from({ length: count }, (_, i) => ({
    type: 'domain',
    value: `malware-example-${i}.com`,
    source: 'benchmark'
  }));

  console.log(`--- OSINT Ingest Benchmark (${count} records) ---`);

  console.log('Running sequential insertion...');
  const seqTime = await sequentialInsert(iocs);
  console.log(`Sequential: ${seqTime.toFixed(2)}ms`);

  console.log('Running batched insertion (chunkSize=100)...');
  const batchTime = await batchedInsert(iocs);
  console.log(`Batched: ${batchTime.toFixed(2)}ms`);

  const speedup = seqTime / batchTime;
  console.log(`\nEstimated Speedup: ${speedup.toFixed(2)}x`);
  console.log('------------------------------------------------');
}

runBenchmark().catch(console.error);
