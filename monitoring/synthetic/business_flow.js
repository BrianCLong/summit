import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function runCheck() {
  console.log(`Starting synthetic check against ${BASE_URL}`);

  const start = performance.now();
  let success = true;

  try {
    // Check Health
    console.log('Checking /health...');
    const health = await axios.get(`${BASE_URL}/health`);
    if (health.status !== 200) throw new Error(`Health check failed: ${health.status}`);
    console.log('Health check passed.');

    // Check Metrics (simulate business user accessing dashboard)
    console.log('Checking /metrics...');
    const metrics = await axios.get(`${BASE_URL}/metrics`);
    if (metrics.status !== 200) throw new Error(`Metrics check failed: ${metrics.status}`);
    console.log('Metrics check passed.');

  } catch (error) {
    console.error('Synthetic check failed:', error instanceof Error ? error.message : String(error));
    success = false;
  } finally {
    const duration = performance.now() - start;
    console.log(`Synthetic check completed in ${duration.toFixed(2)}ms. Success: ${success}`);

    if (!success) process.exit(1);
  }
}

runCheck();
