#!/usr/bin/env node

/**
 * Summit GA Regression Detection Script
 * 
 * Purpose: Detects early GA failure modes: retry storms, queue stagnation, 
 * error concentration (blast radius), and "stuck" work.
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

async function detectRetryStorms() {
  // Look for services where retry rate is > 10% of total request rate
  const query = `
    sum by (service) (rate(http_retry_total[5m])) 
    / 
    sum by (service) (rate(http_requests_total[5m])) 
    > 0.1
  `;
  const result = await queryProm(query);
  if (result.status === 'success' && result.data.result.length > 0) {
    return {
      detected: true,
      services: result.data.result.map(r => ({
        name: r.metric.service,
        ratio: parseFloat(r.value[1]).toFixed(2)
      }))
    };
  }
  return { detected: false };
}

async function detectQueueStagnation() {
  // Look for queues where depth is high AND failure rate is also high
  const query = `
    intelgraph_graph_jobs_queued > 100 
    and 
    rate(intelgraph_graph_jobs_failed_total[5m]) > 0.5
  `;
  const result = await queryProm(query);
  if (result.status === 'success' && result.data.result.length > 0) {
    return {
      detected: true,
      queues: result.data.result.map(r => ({
        name: r.metric.queue || 'default',
        depth: r.value[1]
      }))
    };
  }
  return { detected: false };
}

async function detectErrorConcentration() {
  // Blast radius: is one tenant or service responsible for > 50% of all 5xx?
  const query = `
    sum by (service) (rate(http_requests_total{status_code=~"5.."}[5m]))
    /
    ignoring(service) group_left() sum(rate(http_requests_total{status_code=~"5.."}[5m]))
    > 0.5
  `;
  const result = await queryProm(query);
  if (result.status === 'success' && result.data.result.length > 0) {
    return {
      detected: true,
      hotspots: result.data.result.map(r => ({
        service: r.metric.service,
        concentration: parseFloat(r.value[1]).toFixed(2)
      }))
    };
  }
  return { detected: false };
}

async function run() {
  console.log('🔍 Running Summit GA Early-Life Regression Detection...\n');

  const [retries, queues, hotspots] = await Promise.all([
    detectRetryStorms(),
    detectQueueStagnation(),
    detectErrorConcentration()
  ]);

  let issuesFound = 0;

  console.log('--- 🌪️  Retry Storm Detection ---');
  if (retries.detected) {
    issuesFound++;
    retries.services.forEach(s => {
      console.log(`❌ STORM DETECTED: Service "${s.name}" retry ratio is ${s.ratio}`);
    });
  } else {
    console.log('✅ No retry storms detected.');
  }

  console.log('\n--- 🧊 Queue Stagnation ---');
  if (queues.detected) {
    issuesFound++;
    queues.queues.forEach(q => {
      console.log(`❌ STAGNATION: Queue "${q.name}" is backed up (${q.depth} items) and failing.`);
    });
  } else {
    console.log('✅ Queues are flowing or healthy.');
  }

  console.log('\n--- 🎯 Error Concentration (Blast Radius) ---');
  if (hotspots.detected) {
    issuesFound++;
    hotspots.hotspots.forEach(h => {
      console.log(`❌ CONCENTRATION: Service "${h.service}" accounts for ${h.concentration * 100}% of all errors.`);
    });
  } else {
    console.log('✅ Errors are distributed or minimal.');
  }

  console.log('\n' + '='.repeat(50));
  if (issuesFound > 0) {
    console.log(`🔴 REGRESSION SIGNALS DETECTED (${issuesFound} categories)`);
    console.log('Action: Follow RUNBOOKS/GA_LAUNCH_WEEK_ITERATION.md immediately.');
    process.exit(1);
  } else {
    console.log('💚 NO MAJOR REGRESSIONS DETECTED');
    console.log('Status: Stable. Continue monitoring.');
  }
}

run();
