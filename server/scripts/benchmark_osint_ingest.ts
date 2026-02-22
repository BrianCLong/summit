
// Standalone benchmark for OSINT batching logic

// Mock some IOCs
const mockIOCs = Array.from({ length: 1000 }, (_, i) => ({
  type: 'ip',
  value: `1.2.3.${i}`,
  source: 'benchmark-source'
}));

async function benchmark() {
  console.log('--- Benchmarking OSINT Batch Ingest ---');
  console.log(`Mocking ingest of ${mockIOCs.length} IOCs`);

  // Baseline: Individual inserts (simulated)
  console.log('Starting Individual Inserts (simulated baseline)...');
  const startIndividual = Date.now();
  for (const ioc of mockIOCs) {
    // Simulate a database round-trip latency
    // Average RTT to a local DB is small, but in cloud/high-load it can be 5-20ms
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  const endIndividual = Date.now();
  const individualTime = endIndividual - startIndividual;
  console.log(`Individual Inserts: ${individualTime}ms`);

  // Optimized: Batch inserts (simulated)
  console.log('Starting Batched Inserts (simulated optimized)...');
  const startBatch = Date.now();
  const chunkSize = 100;
  for (let i = 0; i < mockIOCs.length; i += chunkSize) {
    // We'll simulate the same RTT per batch call
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  const endBatch = Date.now();
  const batchTime = endBatch - startBatch;
  console.log(`Batched Inserts: ${batchTime}ms`);

  const speedup = (individualTime / batchTime).toFixed(2);
  console.log(`\nEstimated Speedup: ${speedup}x`);
  console.log('---------------------------------------');

  process.exit(0);
}

benchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
