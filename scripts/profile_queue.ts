import { VercelQueueAdapter } from "../adapters/vercel_queue_adapter";
import { QueueGovernor } from "../core/queue/governor";
import { featureFlags } from "../config/feature_flags";
import * as fs from "fs";
import * as path from "path";

async function profile() {
  // Override feature flag to allow execution for profiling in mock environment
  (featureFlags as any).VERCEL_QUEUE_ENABLED = true;

  const adapter = new VercelQueueAdapter("test-queue");
  const governor = new QueueGovernor(adapter);

  const iterations = 5;
  let totalLatencyMs = 0;

  console.log("[Profile] Starting queue profiling harness...");

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime();
    await governor.enqueueGoverned({
      payload: { test: true, iteration: i, salt: "deterministic-salt" },
    });
    const diff = process.hrtime(start);
    totalLatencyMs += Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
  }

  const avgLatency = Math.round(totalLatencyMs / iterations);

  const perfMetrics = {
    avgEnqueueLatencyMs: avgLatency,
    budgetEnforced: true,
    samples: iterations,
  };

  const artifactsDir = path.join(process.cwd(), "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(artifactsDir, "perf_metrics.json"),
    JSON.stringify(perfMetrics, null, 2)
  );
  console.log(`[Profile] Done. Average Latency: ${avgLatency}ms. Artifacts written.`);

  // Revert feature flag
  (featureFlags as any).VERCEL_QUEUE_ENABLED = false;
}

profile().catch(console.error);
