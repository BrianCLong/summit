import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'environments.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function hashSeed(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(a) {
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  return mulberry32(hashSeed(seed));
}

function normalSample(rng, mean, stddev) {
  const u = 1 - rng();
  const v = 1 - rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stddev;
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * pct));
  return sorted[idx];
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function sampleLatency(env, rng) {
  const { baselineMs, jitterMs, tailMs, tailProbability, latencyBudgetMs, floorMs } = env.latency;
  const base = normalSample(rng, baselineMs, jitterMs);
  const tail = rng() < tailProbability ? Math.max(0, normalSample(rng, tailMs, jitterMs * 0.5)) : 0;
  const concurrencyPenalty = Math.max(0, env.concurrency - 20) * 1.6;
  const latency = Math.max(floorMs || 0, base + tail + concurrencyPenalty);
  const overBudget = Math.max(0, latency - latencyBudgetMs);
  return latency + overBudget * 0.05;
}

function sampleQuality(env, latency, rng) {
  const base = normalSample(rng, env.quality.mean, env.quality.stddev);
  const overBudget = Math.max(0, latency - env.latency.latencyBudgetMs);
  const penalty = (overBudget / env.latency.latencyBudgetMs) * env.quality.latencyPenaltyPerBudgetOverrun;
  return clamp(base - penalty, 0, 1);
}

function sampleCost(env, latency) {
  const tokenCost = ((env.tokens.prompt + env.tokens.completion) / 1000) * env.tokens.usdPerThousand;
  const computeCost = env.computeCostPerSecondUsd * (latency / 1000);
  return tokenCost + computeCost;
}

function runEnvironment(env) {
  const rng = createRng(env.seed);
  const latencies = [];
  const qualities = [];
  const costs = [];
  const warmupIterations = env.warmupIterations || 0;
  const measureIterations = env.measureIterations || 100;

  for (let i = 0; i < warmupIterations; i += 1) {
    sampleLatency(env, rng);
    sampleQuality(env, env.latency.latencyBudgetMs, rng);
    sampleCost(env, env.latency.latencyBudgetMs);
  }

  for (let i = 0; i < measureIterations; i += 1) {
    const latency = sampleLatency(env, rng);
    const quality = sampleQuality(env, latency, rng);
    const cost = sampleCost(env, latency);

    latencies.push(latency);
    qualities.push(quality);
    costs.push(cost);
  }

  const p95Latency = percentile(latencies, 0.95);
  const averageLatency = mean(latencies);
  const throughputRps = averageLatency ? 1000 / averageLatency : 0;
  const averageQuality = mean(qualities);
  const passRate = qualities.filter((value) => value >= env.quality.threshold).length / qualities.length;
  const averageCost = mean(costs);

  return {
    id: env.id,
    name: env.name,
    description: env.description,
    runs: measureIterations,
    p95LatencyMs: Number(p95Latency.toFixed(2)),
    meanLatencyMs: Number(averageLatency.toFixed(2)),
    throughputRps: Number(throughputRps.toFixed(2)),
    qualityAverage: Number(averageQuality.toFixed(3)),
    qualityPassRate: Number(passRate.toFixed(3)),
    costPerRunUsd: Number(averageCost.toFixed(5)),
  };
}

function dominates(a, b) {
  const betterOrEqualQuality = a.qualityAverage >= b.qualityAverage;
  const betterOrEqualLatency = a.p95LatencyMs <= b.p95LatencyMs;
  const betterOrEqualCost = a.costPerRunUsd <= b.costPerRunUsd;
  const strictlyBetter =
    a.qualityAverage > b.qualityAverage ||
    a.p95LatencyMs < b.p95LatencyMs ||
    a.costPerRunUsd < b.costPerRunUsd;
  return betterOrEqualQuality && betterOrEqualLatency && betterOrEqualCost && strictlyBetter;
}

function buildParetoFront(results) {
  const frontier = [];
  results.forEach((candidate) => {
    const dominated = results.some((other) => other !== candidate && dominates(other, candidate));
    if (!dominated) {
      frontier.push(candidate);
    }
  });
  return frontier.sort((a, b) => a.costPerRunUsd - b.costPerRunUsd);
}

function formatCsv(rows) {
  const header = ['environment', 'quality', 'p95_latency_ms', 'cost_per_run_usd'];
  const body = rows.map((row) => `${row.name},${row.qualityAverage},${row.p95LatencyMs},${row.costPerRunUsd}`);
  return [header.join(','), ...body].join('\n');
}

function main() {
  const environments = config.environments || [];
  const results = environments.map(runEnvironment);
  const pareto = buildParetoFront(results);

  const reportDir = path.join(__dirname, 'report-data');
  fs.mkdirSync(reportDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const report = { generatedAt: timestamp, environments: results, paretoFront: pareto };
  fs.writeFileSync(path.join(reportDir, 'environment-metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, 'pareto.json'), `${JSON.stringify(pareto, null, 2)}\n`);
  fs.writeFileSync(path.join(reportDir, 'pareto.csv'), `${formatCsv(pareto)}\n`);

  console.log(`Benchmark environments processed at ${timestamp}`);
  results.forEach((result) => {
    console.log(
      `- ${result.name}: p95=${result.p95LatencyMs}ms, quality=${result.qualityAverage}, passRate=${result.qualityPassRate}, cost=$${result.costPerRunUsd}`
    );
  });
}

main();
