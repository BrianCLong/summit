import fs from "fs";
import path from "path";

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

const outDir = process.env.EVIDENCE_DIR || "artifacts/evidence/goldenpath-frontend/local";
const runId = process.env.EVIDENCE_RUN_ID || "local";

const base = path.join(outDir, runId);

writeJson(path.join(base, "report.json"), {
  evidence_id: "EVD-GOLDENPATH-FRONTEND-001",
  name: "golden-path-frontend",
  status: process.env.E2E_STATUS || "unknown",
  links: [],
});

writeJson(path.join(base, "metrics.json"), {
  evidence_id: "EVD-GOLDENPATH-FRONTEND-002",
  duration_ms: Number(process.env.E2E_DURATION_MS || 0),
  retries: Number(process.env.E2E_RETRIES || 0),
});

writeJson(path.join(base, "stamp.json"), {
  evidence_id: "EVD-GOLDENPATH-FRONTEND-003",
  started_at: new Date().toISOString(),
  finished_at: new Date().toISOString(),
});

writeJson(path.join(base, "evidence/index.json"), {
  evidence_id: "EVD-GOLDENPATH-FRONTEND-004",
  files: ["report.json", "metrics.json", "stamp.json"],
});

console.log(`Evidence written to ${base}`);
