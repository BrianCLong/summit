import fs from "node:fs";
import path from "node:path";
import { sha256hex } from "./lib/sha.mjs";
import { parseArgs } from "./lib/args.mjs";

const args = parseArgs(process.argv.slice(2));
const indexPath = args.index;
const evidenceDir = args["evidence-dir"] || "evidence";

if (!indexPath || !fs.existsSync(indexPath)) {
  console.error("Index file not found");
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
console.log(`Verifying index for release ${index.release} (commit ${index.commit})`);

for (const item of index.items) {
  const p = path.join(evidenceDir, item.path);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing evidence file: ${item.path}`);
  }
  const buf = fs.readFileSync(p);
  const hash = sha256hex(buf);
  if (hash !== item.sha256) {
    throw new Error(`Hash mismatch for ${item.path}. Expected ${item.sha256}, got ${hash}`);
  }
}

console.log("✅ Evidence index verified");
