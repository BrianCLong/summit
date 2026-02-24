#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [key, value] = token.split('=');
    if (value !== undefined) {
      args[key.slice(2)] = value;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key.slice(2)] = next;
      i++;
    } else {
      args[key.slice(2)] = true;
    }
  }
  return args;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(idx, 0)];
}

async function runLiveSimulation(args) {
  const baseUrl = args.url || process.env.APPROVALS_BASE_URL;
  const tenantId = args.tenant || process.env.APPROVALS_TENANT_ID;
  const requestId = args.request || process.env.APPROVALS_REQUEST_ID;
  const iterations = Number(args.iterations || 20);

  if (!baseUrl || !tenantId || !requestId) {
    throw new Error(
      'Live mode requires --url, --tenant, and --request (or corresponding env vars).',
    );
  }

  const durations = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/api/v1/requests/${requestId}/simulate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: '{}',
      },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Live simulation failed (${response.status}): ${text}`);
    }
    durations.push(performance.now() - start);
  }
  return durations;
}

function runFixtureSimulation(args) {
  const fixturePath = path.resolve(
    process.cwd(),
    args.fixture || 'scripts/switchboard/fixtures/approval-latency-sample.json',
  );
  const raw = fs.readFileSync(fixturePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.durations_ms) || parsed.durations_ms.length === 0) {
    throw new Error(
      `Fixture ${fixturePath} must include non-empty durations_ms array`,
    );
  }
  return parsed.durations_ms.map(Number).filter(Number.isFinite);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const thresholdP95 = Number(args.threshold || 1500);
  const mode = args.mode || (args.url ? 'live' : 'fixture');

  const durations =
    mode === 'live' ? await runLiveSimulation(args) : runFixtureSimulation(args);

  const p50 = Number(percentile(durations, 50).toFixed(2));
  const p95 = Number(percentile(durations, 95).toFixed(2));
  const p99 = Number(percentile(durations, 99).toFixed(2));

  const report = {
    mode,
    samples: durations.length,
    p50_ms: p50,
    p95_ms: p95,
    p99_ms: p99,
    target_p95_ms: thresholdP95,
    pass: p95 < thresholdP95,
  };

  const outPath = path.resolve(
    process.cwd(),
    args.out || 'reports/switchboard-approval-flow-perf.json',
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        pass: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
