#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

const args = Object.fromEntries(process.argv.slice(2).map((v,i,a)=>{
  if (v.startsWith("--")) return [v.slice(2), a[i+1] && !a[i+1].startsWith("--") ? a[i+1] : true];
  return [];
}).filter(Boolean));

const root = args.root || ".github/workflows";
const outDir = args.out || "artifact";
fs.mkdirSync(outDir, { recursive: true });

function ensureConcurrency(obj) {
  // if workflow already has concurrency, leave it
  if (!obj.concurrency) {
    obj.concurrency = { group: "${{ github.workflow }}-${{ github.ref }}", "cancel-in-progress": true };
  }
  // ensure jobs that are long-running can have groups (optional: leave as-is)
  if (obj.jobs && typeof obj.jobs === "object") {
    for (const [k, j] of Object.entries(obj.jobs)) {
      if (!j.concurrency) {
        j.concurrency = { group: "${{ github.workflow }}-${{ github.ref }}-${{ github.job }}", "cancel-in-progress": true };
      }
    }
  }
}

for (const f of fs.readdirSync(root).filter(x => x.endsWith(".yml")||x.endsWith(".yaml"))) {
  const p = path.join(root, f);
  const src = fs.readFileSync(p, "utf8");
  let y; try { y = yaml.parse(src); } catch { continue; }
  const before = yaml.stringify(y);
  ensureConcurrency(y);
  const after = yaml.stringify(y, { lineWidth: 120 });
  if (before !== after) {
    fs.writeFileSync(path.join(outDir, f + ".fixed"), after);
  }
}
