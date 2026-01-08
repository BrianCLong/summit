#!/usr/bin/env -S npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { program } from 'commander';

program
  .option('--dir <dir>', 'Directory containing summary JSONs', 'dist/ci/gates')
  .option('--output <file>', 'Output report file', 'dist/ci/gate-stability-report.json')
  .parse(process.argv);

const options = program.opts();

interface Summary {
  gate_id: string;
  run_id: string;
  timestamp: string;
  outcome: 'PASS' | 'FAIL' | 'SKIPPED';
  duration_seconds: number;
  is_quarantine: boolean;
  is_retry: boolean;
}

interface GateStats {
  gate_id: string;
  total_runs: number;
  pass_rate_percent: number;
  consecutive_green: number;
  flake_retry_percent: number;
  p95_duration_seconds: number;
  last_run_outcome: string;
}

function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const index = Math.ceil(0.95 * values.length) - 1;
  return values[index];
}

function analyze(dir: string): Record<string, GateStats> {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.summary.json'));
  const summaries: Summary[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      summaries.push(JSON.parse(content));
    } catch (e) {
      console.warn(`Failed to read ${file}:`, e);
    }
  }

  const byGate: Record<string, Summary[]> = {};
  for (const s of summaries) {
    if (!byGate[s.gate_id]) byGate[s.gate_id] = [];
    byGate[s.gate_id].push(s);
  }

  const report: Record<string, GateStats> = {};

  for (const [gateId, runs] of Object.entries(byGate)) {
    // Sort by timestamp desc
    runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = runs.length;
    const passes = runs.filter(r => r.outcome === 'PASS').length;
    const retries = runs.filter(r => r.is_retry || r.is_quarantine).length;

    let consecutiveGreen = 0;
    for (const r of runs) {
      if (r.outcome === 'PASS') consecutiveGreen++;
      else break;
    }

    const durations = runs.map(r => r.duration_seconds);
    const p95 = calculateP95(durations);

    report[gateId] = {
      gate_id: gateId,
      total_runs: total,
      pass_rate_percent: (passes / total) * 100,
      consecutive_green: consecutiveGreen,
      flake_retry_percent: (retries / total) * 100,
      p95_duration_seconds: p95,
      last_run_outcome: runs[0]?.outcome || 'UNKNOWN'
    };
  }

  return report;
}

if (!fs.existsSync(options.dir)) {
  console.log(`Directory ${options.dir} does not exist. Writing empty report.`);
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, JSON.stringify({}, null, 2));
} else {
  const stats = analyze(options.dir);
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, JSON.stringify(stats, null, 2));
  console.log(`Wrote stability report to ${options.output}`);

  // Also write MD
  const mdPath = options.output.replace('.json', '.md');
  let md = '# Gate Stability Report\n\n| Gate ID | Runs | Pass Rate | Streak | P95 Duration |\n|---|---|---|---|---|\n';
  for (const s of Object.values(stats)) {
    md += `| ${s.gate_id} | ${s.total_runs} | ${s.pass_rate_percent.toFixed(1)}% | ${s.consecutive_green} | ${s.p95_duration_seconds.toFixed(1)}s |\n`;
  }
  fs.writeFileSync(mdPath, md);
  console.log(`Wrote markdown report to ${mdPath}`);
}
