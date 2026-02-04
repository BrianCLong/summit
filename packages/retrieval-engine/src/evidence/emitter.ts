import fs from 'fs';
import path from 'path';
import { RetrievalPlan, RetrievalResult } from '../types.js';
import { canonicalize, sha256 } from '../util/canonical.js';

export async function emitEvidence(
  plan: RetrievalPlan,
  result: RetrievalResult,
  policyUsed: any,
  sources: any[] = []
): Promise<string> {
  const planJson = canonicalize(plan);
  const planHash = sha256(planJson);

  // Deterministic run ID based on plan hash (and maybe policy hash, but plan hash is good for now)
  const runId = planHash.substring(0, 12);

  // Use a standard location, e.g., artifacts/evidence/retrieval/<runId>/
  // Assuming process.cwd() is the repo root when running in production or CI
  // But for safety, we might want to allow configuring the root.
  // For this substrate, we'll try to find the root or use relative paths.
  const evidenceDir = path.join(process.cwd(), 'artifacts/evidence/retrieval', runId);

  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // 1. Plan
  fs.writeFileSync(path.join(evidenceDir, 'plan.json'), planJson);

  // 2. Policy
  const policyJson = canonicalize(policyUsed);
  fs.writeFileSync(path.join(evidenceDir, 'policy.json'), policyJson);

  // 3. Sources (Inputs)
  const sourcesJson = canonicalize(sources);
  fs.writeFileSync(path.join(evidenceDir, 'sources.json'), sourcesJson);

  // 4. Metrics/Result (Outcome)
  // We separate machine-readable metrics from full result if needed, but here result includes graph stats.
  const metricsJson = canonicalize({
    graph: result.graph,
    contextCount: result.contexts.length,
    // durations omitted for determinism unless strictly needed
  });
  fs.writeFileSync(path.join(evidenceDir, 'metrics.json'), metricsJson);

  // 5. Retrieval Result (The actual "output" or a pointer to it)
  // We might not want to dump full contexts if they are huge, but for now we do.
  fs.writeFileSync(path.join(evidenceDir, 'retrieval.json'), canonicalize(result));

  return evidenceDir;
}
