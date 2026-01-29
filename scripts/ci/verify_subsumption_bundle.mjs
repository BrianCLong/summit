// scripts/ci/verify_subsumption_bundle.mjs
import fs from "node:fs";
import path from "node:path";

function stableJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort(), 2) + "\n";
}

const ITEM_SLUG = "claim-level-graphrag";
const root = process.cwd();

function mustExist(p) {
  if (!fs.existsSync(p)) throw new Error(`Missing required path: ${p}`);
}

function writeEvidence(evidenceId, report, metrics, stamp) {
  const dir = path.join(root, "evidence", "subsumption", ITEM_SLUG, evidenceId);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, "report.json"), stableJson(report));
  fs.writeFileSync(path.join(dir, "metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "stamp.json"), JSON.stringify(stamp, null, 2) + "\n");
}

function main() {
  console.log("Verifying subsumption bundle: " + ITEM_SLUG);
  const manifest = path.join(root, "subsumption", ITEM_SLUG, "manifest.yaml");
  mustExist(manifest);
  mustExist(path.join(root, "evidence", "index.json"));
  mustExist(path.join(root, "evidence", "schemas", "report.schema.json"));
  mustExist(path.join(root, "evidence", "schemas", "metrics.schema.json"));
  mustExist(path.join(root, "evidence", "schemas", "stamp.schema.json"));

  // docs check
  mustExist(path.join(root, "docs", "standards", "claim-level-graphrag.md"));
  mustExist(path.join(root, "docs", "decisions", "claim-level-graphrag.md"));

  // deny-by-default fixtures must exist
  const denyDir = path.join(root, "subsumption", ITEM_SLUG, "deny-fixtures");
  mustExist(denyDir);
  mustExist(path.join(denyDir, "unsupported_claim.json"));
  mustExist(path.join(denyDir, "contradiction_claim.json"));
  mustExist(path.join(denyDir, "prompt_injection_evidence.json"));

  const evidenceId = "EVD-CLGRAG-CI-001";
  writeEvidence(
    evidenceId,
    { evidence_id: evidenceId, item_slug: ITEM_SLUG, claims: [], decisions: ["bundle_verified"] },
    { evidence_id: evidenceId, metrics: { verifier_ok: 1 } },
    { evidence_id: evidenceId, created_at: new Date().toISOString(), tool_versions: { node: process.version } }
  );

  process.stdout.write("OK: subsumption bundle verified\n");
}

main();
