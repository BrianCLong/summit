import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PROM_URL = process.env.PROM_URL;
const PROM_TOKEN = process.env.PROM_TOKEN;
const REQUIRE_PROM = process.env.REQUIRE_PROM === 'true';

const getGitSha = () => {
    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
        return 'dev';
    }
};

const SHA = process.env.GITHUB_SHA || getGitSha();
const OUTPUT_DIR = `artifacts/evidence/post-deploy/${SHA}`;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface SLOQuery {
  name: string;
  query: string;
  description: string;
}

const QUERIES: SLOQuery[] = [
  {
    name: 'error_rate_5m',
    query: 'sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))',
    description: 'Global 5xx Error Rate (5m window)',
  },
  {
    name: 'p95_latency_5m',
    query: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))',
    description: 'P95 Latency (5m window)',
  },
   {
    name: 'request_volume_5m',
    query: 'sum(rate(http_request_duration_seconds_count[5m]))',
    description: 'Global Request Volume (RPS, 5m window)',
  },
  {
    name: 'pod_restarts_1h',
    query: 'sum(increase(kube_pod_container_status_restarts_total[1h]))',
    description: 'Pod Restarts (Last 1h)',
  },
];

async function runSnapshot() {
  if (!PROM_URL) {
    console.warn('PROM_URL not set. Skipping SLO snapshot.');
    const result = { status: 'skipped', reason: 'PROM_URL missing' };
    writeSnapshot(result);
    if (REQUIRE_PROM) {
        console.error("REQUIRE_PROM is true, but PROM_URL is missing.");
        process.exit(1);
    }
    return;
  }

  console.log(`Snapshotting SLOs from ${PROM_URL}...`);

  const results: any[] = [];
  let overallStatus = 'success';
  let hasFailure = false;

  for (const q of QUERIES) {
    try {
      const url = new URL(`${PROM_URL}/api/v1/query`);
      url.searchParams.append('query', q.query);

      const headers: Record<string, string> = {};
      if (PROM_TOKEN) {
          headers['Authorization'] = `Bearer ${PROM_TOKEN}`;
      }

      // Use native fetch (Node 18+)
      const response = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.status === 'success') {
          // If vector is empty, it means no data found for that query
          const value = data.data.result.length > 0 ? data.data.result[0].value[1] : 'no_data';
          results.push({ ...q, value, status: 'success' });
      } else {
          results.push({ ...q, status: 'error', error: data.error });
          hasFailure = true;
      }
    } catch (err: any) {
      console.error(`Failed to query ${q.name}:`, err.message);
      results.push({ ...q, status: 'error', error: err.message });
      hasFailure = true;
    }
  }

  if (hasFailure) {
      overallStatus = 'partial_failure';
      if (REQUIRE_PROM) {
          // Check if all failed (total failure) or just some
          const successCount = results.filter(r => r.status === 'success').length;
          if (successCount === 0) {
              console.error("All Prometheus queries failed and REQUIRE_PROM=true.");
              process.exit(1);
          }
      }
  }

  writeSnapshot({
    timestamp: new Date().toISOString(),
    prom_url: PROM_URL,
    status: overallStatus,
    results
  });
}

function writeSnapshot(data: any) {
  const jsonPath = path.join(OUTPUT_DIR, 'slo_snapshot.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`Wrote JSON snapshot to ${jsonPath}`);

  // Generate MD
  const mdPath = path.join(OUTPUT_DIR, 'slo_snapshot.md');
  let mdContent = `# SLO Snapshot\n\n`;
  mdContent += `**Timestamp:** ${data.timestamp || new Date().toISOString()}\n`;
  mdContent += `**Status:** ${data.status}\n\n`;

  if (data.results) {
      mdContent += `| Metric | Value | Description |\n`;
      mdContent += `|---|---|---|\n`;
      for (const r of data.results) {
          let valDisplay = r.value;
          if (r.status === 'success' && r.value !== 'no_data') {
              valDisplay = parseFloat(r.value).toFixed(4);
          } else if (r.status === 'error') {
              valDisplay = `ERROR: ${r.error}`;
          }
          mdContent += `| ${r.name} | ${valDisplay} | ${r.description} |\n`;
      }
  } else {
      mdContent += `*Snapshot skipped or failed: ${data.reason}*\n`;
  }

  fs.writeFileSync(mdPath, mdContent);
  console.log(`Wrote MD summary to ${mdPath}`);
}

runSnapshot().catch(err => {
    console.error("Fatal error in SLO snapshot:", err);
    process.exit(1);
});
