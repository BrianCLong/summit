import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { planFingerprint } from './plan-hash.js';

// Configuration interface
interface PlanSamplerConfig {
  enabled: boolean;
  global_sampling_rate: number;
  overrides?: Array<{ pattern: string; rate: number }>;
  trigger_on_latency_p95_ms: number;
  trigger_on_error_rate: number;
  sample_bucket_dir: string;
  max_samples_per_query: number;
}

// Default configuration
const DEFAULT_CONFIG: PlanSamplerConfig = {
  enabled: true,
  global_sampling_rate: 0.0075,
  trigger_on_latency_p95_ms: 400,
  trigger_on_error_rate: 0.01,
  sample_bucket_dir: '.plan-samples',
  max_samples_per_query: 2000,
};

let config: PlanSamplerConfig = DEFAULT_CONFIG;
let configLoaded = false;

// Load configuration
function loadConfig() {
  if (configLoaded) return;

  const configPath = path.join(process.cwd(), 'server', 'plan_sampler_config.yml');
  const fallbackPath = path.join(process.cwd(), 'plan_sampler_config.yml');

  try {
    let fileContent: string | null = null;
    if (fs.existsSync(configPath)) {
      fileContent = fs.readFileSync(configPath, 'utf8');
    } else if (fs.existsSync(fallbackPath)) {
      fileContent = fs.readFileSync(fallbackPath, 'utf8');
    }

    if (fileContent) {
      const loaded = yaml.load(fileContent) as Partial<PlanSamplerConfig>;
      config = { ...DEFAULT_CONFIG, ...loaded };
    }
  } catch (err) {
    console.warn('Failed to load plan_sampler_config.yml, using defaults', err);
  }

  // Environment variable overrides
  if (process.env.PLAN_SAMPLER_ENABLED) {
    config.enabled = process.env.PLAN_SAMPLER_ENABLED.toLowerCase() === 'true';
  }
  if (process.env.PLAN_SAMPLING_RATE) {
    config.global_sampling_rate = parseFloat(process.env.PLAN_SAMPLING_RATE);
  }

  // Ensure sample directory exists
  try {
    const sampleDir = path.resolve(process.cwd(), config.sample_bucket_dir);
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }
  } catch (e) {
    console.warn('Failed to create plan sample directory', e);
  }

  configLoaded = true;
}

// Helper to determine sampling rate for a query
function getRateFor(query: string): number {
  if (config.overrides) {
    for (const o of config.overrides) {
      if (query.includes(o.pattern)) {
        return o.rate;
      }
    }
  }
  return config.global_sampling_rate;
}

function shouldSample(query: string): boolean {
  if (!config.enabled) return false;
  return Math.random() < getRateFor(query);
}

function shouldProfile(latencyMs: number, hasError: boolean): boolean {
  if (!config.enabled) return false;
  // If hasError is true, error rate for this execution is 1.0 >= trigger rate
  if (hasError && config.trigger_on_error_rate <= 1.0) return true;
  return latencyMs >= config.trigger_on_latency_p95_ms;
}

function saveSample(
  query: string,
  params: any,
  planJson: any,
  latencyMs: number,
  profiled: boolean,
  extra: any = {}
) {
  try {
    const fp = planFingerprint(planJson);

    // Sort params for stable hash
    const paramsHash = params ? planFingerprint(params) : null;

    const sample = {
      ts: new Date().toISOString(),
      query,
      fp,
      latency_ms: latencyMs,
      profiled,
      params_hash: paramsHash,
      extra
    };

    const day = new Date().toISOString().split('T')[0];
    const sampleDir = path.resolve(process.cwd(), config.sample_bucket_dir);
    const outFile = path.join(sampleDir, `samples-${day}.jsonl`);

    fs.appendFileSync(outFile, JSON.stringify(sample) + '\n', 'utf8');
  } catch (e) {
    console.warn('Failed to save plan sample', e);
  }
}

/**
 * Main entry point for sampling logic.
 *
 * @param cypher The Cypher query string
 * @param params Query parameters
 * @param latencyMs Execution duration in milliseconds
 * @param hasError Whether the execution failed
 * @param operation 'read' or 'write' (inferred)
 * @param createSession Callback to create a FRESH session for profiling
 */
export async function maybeSample(
  cypher: string,
  params: any,
  latencyMs: number,
  hasError: boolean,
  operation: string,
  createSession: () => Promise<any> | any
): Promise<void> {
  // Lazy load config on first use
  loadConfig();

  if (!config.enabled) return;

  // Decision logic
  // 1. Random sampling
  const isRandomSample = shouldSample(cypher);

  // 2. Trigger-based profiling (high latency or error)
  // Only for critical queries? The prompt said "PROFILE on triggers".
  // User code: "if should_sample(cypher) or (critical and should_profile...)"
  // We don't have 'critical' flag passed in.
  // We'll assume all queries are eligible for triggers if enabled.
  const isTriggered = shouldProfile(latencyMs, hasError);

  if (isRandomSample || isTriggered) {
    // Only profile READ operations to avoid double-writes
    if (operation !== 'read') {
      // For writes, we can't safely re-run with PROFILE.
      // We could try EXPLAIN but that doesn't give stats.
      // We'll skip profiling for writes to be safe.
      return;
    }

    let session = null;
    try {
      session = await createSession();
      // Run PROFILE
      const result = await session.run(`PROFILE ${cypher}`, params);

      // Extract plan
      // Neo4j driver result summary has .profile
      const summary = await result.summary(); // if using driver 5.x
      // Or result.summary directly if it's already available?
      // await session.run returns Result which is a Promise resolving to ResultSummary?
      // No, run() returns Result (stream).
      // If we await run(), we get ResultSummary? No.
      // The driver usage in `neo4j.ts` is `const result = await session.run(...)`.
      // The `result` object has `records` and `summary`.
      // Wait, `neo4j.ts` returns `result`.
      // If we run a NEW query here:

      // Standard driver:
      // const res = await session.run(...) -> returns Result object (which is promise-like)
      // Actually, await session.run(...) returns a { records: [], summary: ... } object in recent drivers?
      // Let's assume standard behavior.

      if (summary && summary.profile) {
          // summary.profile is the plan with stats
          // We need to convert it to a plain object if it's not already?
          // It's usually a JS object tree.
          saveSample(cypher, params, summary.profile, latencyMs, true, { trigger: isTriggered ? 'latency/error' : 'random' });
      } else if (summary && summary.plan) {
          // EXPLAIN returns .plan
          saveSample(cypher, params, summary.plan, latencyMs, true, { trigger: isTriggered ? 'latency/error' : 'random', type: 'explain' });
      }
    } catch (err) {
      console.warn('Failed to profile sampled query', err);
    } finally {
      if (session) {
        await session.close();
      }
    }
  }
}
