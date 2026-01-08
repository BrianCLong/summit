import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

// Schema for artifacts
const SignalsSchema = z.object({
  pilot_id: z.string(),
  sector: z.string(),
  period: z.string(),
  total_runs: z.number().int().min(0),
  runs: z.array(z.object({
    id: z.string(),
    status: z.enum(['READY', 'NOT READY']),
    reason_codes: z.array(z.string()).optional(),
    trust_pack_verified: z.boolean(),
  })),
  sync_stats: z.object({
    total_sessions: z.number().int(),
    sessions_within_budget: z.number().int(),
  }).optional(),
  gate_summaries: z.array(z.object({
    total_gates: z.number().int(),
    quarantined_gates: z.number().int(),
  })).optional(),
});

// Deterministic JSON stringify helper
function stableStringify(obj: any): string {
    const allKeys = new Set<string>();
    JSON.stringify(obj, (key, value) => {
        allKeys.add(key);
        return value;
    });

    // Sort keys strictly
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value).sort().reduce((sorted, k) => {
                sorted[k] = value[k];
                return sorted;
            }, {} as any);
        }
        return value;
    }, 2);
}

async function main() {
  const args = process.argv.slice(2);
  // Usage: <sector> <period> <input_dir>
  if (args.length < 3) {
    console.error('Usage: tsx collect_pilot_signals.ts <sector> <period> <input_dir>');
    process.exit(1);
  }

  const [sector, period, inputDir] = args;

  // In a real implementation, we would glob for specific artifact files.
  // For this pilot, we will assume normalized JSON inputs are present or mocked.
  // We'll read mocked data for now to demonstrate the contract.

  const signals = {
    pilot_id: `pilot-${sector}-${period}`,
    sector,
    period,
    total_runs: 0,
    runs: [],
    sync_stats: { total_sessions: 0, sessions_within_budget: 0 },
    gate_summaries: []
  };

  // Mocking aggregation logic from input artifacts
  // Try to find readiness.json
  const readinessPath = path.join(inputDir, 'readiness.json');
  if (fs.existsSync(readinessPath)) {
    const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
    signals.total_runs = readiness.runs?.length || 0;
    signals.runs = readiness.runs.map((r: any) => ({
      id: r.id,
      status: r.status,
      reason_codes: r.reason_codes || [],
      trust_pack_verified: r.verified || false
    }));
  }

  const budgetPath = path.join(inputDir, 'budget.json');
  if (fs.existsSync(budgetPath)) {
    const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
    signals.sync_stats = budget.sync_stats;
  }

  const gatesPath = path.join(inputDir, 'gates.json');
  if (fs.existsSync(gatesPath)) {
     const gates = JSON.parse(fs.readFileSync(gatesPath, 'utf8'));
     signals.gate_summaries = gates.summaries;
  }

  // Validate output
  try {
    SignalsSchema.parse(signals);
  } catch(e) {
    console.error("Signal schema validation failed", e);
    process.exit(1);
  }

  const outDir = path.join('dist/pilot-reporting', sector, period);
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'signals.json');
  // Use stable stringify for determinism
  fs.writeFileSync(outPath, stableStringify(signals));
  console.log(`Signals collected to ${outPath}`);
}

main();
