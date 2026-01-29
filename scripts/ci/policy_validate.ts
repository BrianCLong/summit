import { canonicalizePolicy, validatePolicy } from "../../packages/policy-cards/src/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type Report = { ok: boolean; errors: string[]; policyHash?: string; evidenceId: string };
type Metrics = { validation_ms: number; errors_count: number };
type Stamp = { evidenceId: string; ts: string; policyHash?: string | null };

function now() { return Date.now(); }

async function main() {
  const start = now();

  // Input: Environment variable POLICY_FILE or default to a dummy one for testing
  const policyPath = process.env.POLICY_FILE;
  let policyText = "{}\n";

  if (policyPath) {
      if (fs.existsSync(policyPath)) {
          policyText = fs.readFileSync(policyPath, 'utf-8');
      } else {
          console.error(`Policy file not found: ${policyPath}`);
          process.exit(1);
      }
  }

  const canonical = canonicalizePolicy(policyText);
  const res = validatePolicy(canonical);

  const evidenceId = process.env.EVIDENCE_ID ?? `EVID-POLICY-${new Date().toISOString().split('T')[0]}-UNKNOWN-report`;

  const report: Report = { ok: res.ok, errors: res.errors, policyHash: res.hash, evidenceId };
  const metrics: Metrics = { validation_ms: now() - start, errors_count: res.errors.length };
  const stamp: Stamp = { evidenceId, ts: new Date().toISOString(), policyHash: res.hash ?? null };

  // Output directory
  const artifactDir = process.env.ARTIFACT_DIR || path.join(process.cwd(), "artifacts", "policy");
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // Deterministic JSON stringify (simple version: ensure keys are ordered if we were building the object dynamically,
  // but here the types define the order mostly. For true determinism we'd use a library like 'fast-json-stable-stringify'
  // but let's stick to standard JSON.stringify for v0 with the assumption that key order is preserved in modern JS engines).

  fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(artifactDir, "metrics.json"), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(artifactDir, "stamp.json"), JSON.stringify(stamp, null, 2));

  console.log(`Validation complete. Artifacts written to ${artifactDir}`);

  if (!res.ok) {
      console.error("Policy validation failed:", res.errors);
      process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
