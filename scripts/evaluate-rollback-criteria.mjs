#!/usr/bin/env node

/**
 * Summit GA Rollback Evaluation Script
 *
 * Purpose: Compares post-deploy metrics against a baseline (pre-deploy snapshot)
 * to provide a clear "Rollback" or "Continue" signal.
 */

const PROM_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

async function queryProm(query) {
  const url = `${PROM_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
    return await res.json();
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function run() {
  console.log('📉 Evaluating Summit GA Rollback Criteria...\n');

  // Example query: Error rate in last 5 minutes
  const res = await queryProm('sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))');
  const errRate = (res.status === 'success' && res.data.result.length > 0) ? parseFloat(res.data.result[0].value[1]) : 0;

  console.log(`Current Error Rate: ${(errRate * 100).toFixed(2)}%`);

  // Rollback threshold: > 5% error rate
  if (errRate > 0.05) {
    console.log('🔴 ROLLBACK RECOMMENDED: Error rate exceeds 5% threshold.');
    process.exit(1);
  } else {
    console.log('💚 CONTINUE DEPLOYMENT: Metrics are within stable bounds.');
    process.exit(0);
  }
}

run();
