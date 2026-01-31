// scripts/monitoring/automation-turn-6-drift.mjs
import fs from "node:fs";

const required = [
  "subsumption/automation-turn-6/manifest.yaml",
  "evidence/index.json",
  "docs/decisions/automation-turn-6.md"
];

let missing = 0;
for (const p of required) {
  if (!fs.existsSync(p)) {
    console.error(`DRIFT: missing ${p}`);
    missing++;
  }
}

if (missing > 0) {
    console.error(`Drift detected: ${missing} required files missing.`);
    process.exit(2);
} else {
    console.log("No drift detected.");
    process.exit(0);
}
