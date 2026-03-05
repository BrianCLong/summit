// Benchmark script for multi-cloud router
import { AwsProvider } from '../../src/providers/aws-provider';
import { GcpProvider } from '../../src/providers/gcp-provider';
import { SummitQuery } from '../../src/providers/cloud-provider';
import { ProviderRouter } from '../../src/resilience/provider-router';
import * as fs from 'fs';
import * as path from 'path';

async function runBenchmark() {
  const aws = new AwsProvider();
  const gcp = new GcpProvider();
  const router = new ProviderRouter([aws, gcp]);

  const q: SummitQuery = { id: 'bench-1', payload: {} };

  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    await router.routeQuery(q);
  }
  const end = Date.now();

  const metrics = {
    totalTimeMs: end - start,
    avgTimeMs: (end - start) / 1000,
    timestamp: new Date().toISOString()
  };

  const metricsPath = 'artifacts/metrics.json';
  if (!fs.existsSync('artifacts')) {
    fs.mkdirSync('artifacts', { recursive: true });
  }

  let existingMetrics = {};
  if (fs.existsSync(metricsPath)) {
      try {
          existingMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      } catch (e) {
          // Ignore
      }
  }

  const newMetrics = { ...existingMetrics, ...metrics };
  fs.writeFileSync(metricsPath, JSON.stringify(newMetrics, null, 2));
  console.log(`Benchmark completed in ${metrics.totalTimeMs}ms`);
}

runBenchmark().catch(console.error);
