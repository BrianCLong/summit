#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

if (process.argv.length < 3) {
  console.error('Usage: node analyze-cost-extension.mjs <summary.json>');
  process.exit(1);
}

const [summaryPath] = process.argv.slice(2);

async function main() {
  const raw = await readFile(summaryPath, 'utf8');
  const json = JSON.parse(raw);
  const results = json.metrics?.http_req_duration;
  if (!json.root_group?.checks) {
    console.warn('No checks found in summary; ensure k6 summary export is enabled.');
  }

  const records = [];
  const samples = [];

  function extractFromGroup(group) {
    if (!group) return;
    if (group.extra && group.extra.graphCost) {
      for (const entry of group.extra.graphCost) {
        records.push(entry);
      }
    }
    if (group.groups) {
      for (const child of group.groups) {
        extractFromGroup(child);
      }
    }
  }

  extractFromGroup(json.root_group);

  const aggregates = {};
  for (const record of records) {
    const key = record.operation ?? 'unknown';
    const metrics = record.metrics ?? {};
    const meta = record.meta ?? {};
    if (!aggregates[key]) {
      aggregates[key] = {
        samples: [],
        retries: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
    }
    if (typeof metrics.resultConsumedAfterMs === 'number') {
      aggregates[key].samples.push(metrics.resultConsumedAfterMs);
    }
    if (typeof meta.retryCount === 'number') {
      aggregates[key].retries += meta.retryCount;
    }
    if (meta.cache?.hit === true) {
      aggregates[key].cacheHits += 1;
    } else if (meta.cache?.hit === false) {
      aggregates[key].cacheMisses += 1;
    }
    samples.push(metrics.resultConsumedAfterMs ?? 0);
  }

  function percentile(arr, pct) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((pct / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
  }

  console.log('=== Cost Extension Analysis ===');
  for (const [operation, aggregate] of Object.entries(aggregates)) {
    const p50 = percentile(aggregate.samples, 50);
    const p95 = percentile(aggregate.samples, 95);
    const totalCache = aggregate.cacheHits + aggregate.cacheMisses;
    const cacheRatio = totalCache ? aggregate.cacheHits / totalCache : 0;
    console.log(`\nOperation: ${operation}`);
    console.log(`  samples: ${aggregate.samples.length}`);
    console.log(`  p50: ${p50.toFixed(2)} ms`);
    console.log(`  p95: ${p95.toFixed(2)} ms`);
    console.log(`  retries: ${aggregate.retries}`);
    console.log(`  cache hit ratio: ${(cacheRatio * 100).toFixed(1)}%`);
  }

  if (results) {
    console.log('\n=== HTTP Duration Metrics ===');
    console.log(JSON.stringify(results, null, 2));
  }
}

main().catch((error) => {
  console.error('Failed to analyze summary:', error);
  process.exit(1);
});
