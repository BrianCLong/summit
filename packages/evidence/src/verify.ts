import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function die(msg: string): never { console.error(msg); process.exit(1); }

type VerifyOpts = { evidenceDir: string };

export function verifyEvidence({ evidenceDir }: VerifyOpts) {
  const required = ["report.json", "metrics.json", "stamp.json", "index.json"];
  for (const f of required) {
    const p = path.join(evidenceDir, f);
    if (!fs.existsSync(p)) die(`Missing evidence file: ${p}`);
  }
  // Minimal deny-by-default: index.json must map at least 1 EVD id.
  const index = JSON.parse(fs.readFileSync(path.join(evidenceDir, "index.json"), "utf8"));
  if (!index?.evidence || Object.keys(index.evidence).length === 0) {
    die("index.json must include at least one evidence mapping under { evidence: { ... } }");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? "evidence";
  verifyEvidence({ evidenceDir: dir });
  console.log("OK: evidence verified");
}
