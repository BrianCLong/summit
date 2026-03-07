import fs from "node:fs";
import path from "node:path";

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function gatherMetrics() {
  return {
    updated_at: new Date().toISOString(),
    avg_total_min: Number(process.env.CI_TOTAL_MIN || 10),
    test_p95_min: Number(process.env.CI_TEST_P95_MIN || 9),
    avg_queue_sec: Number(process.env.CI_QUEUE_SEC || 15),
    avg_cpu: Number(process.env.CI_CPU || 0.7),
    flaky_rate: Number(process.env.CI_FLAKY || 0.02),
    last_cache_miss_minutes: Number(process.env.CI_CACHE_MISS_MIN || 3),
    graph_churn_rate: Number(process.env.CI_GRAPH_CHURN || 0.1),
  };
}

const stateDir = path.join(".ci", "state");
ensureDir(stateDir);
const statePath = path.join(stateDir, "stats.json");
const data = gatherMetrics();
fs.writeFileSync(statePath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${statePath}`);
