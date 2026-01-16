#!/usr/bin/env node
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--threat-model") out.tm = argv[++i];
    else if (a === "--evidence-dir") out.dir = argv[++i];
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!out.tm) throw new Error("Missing --threat-model");
  if (!out.dir) throw new Error("Missing --evidence-dir");
  return out;
}

const args = parseArgs(process.argv);
const txt = fs.readFileSync(args.tm, "utf8");

// Minimal parse: collect lines like `evidence: some/path.ext`
const evidences = [];
for (const line of txt.split(/\r?\n/)) {
  const m = line.match(/^\s*evidence:\s*(.+?)\s*$/);
  if (m) evidences.push(m[1].replace(/^["']|["']$/g, ""));
}

const missing = [];
for (const e of evidences) {
  const p = path.resolve(args.dir, e);
  if (!fs.existsSync(p)) missing.push(e);
}

if (missing.length) {
  process.stderr.write(`Threat-model evidence missing: ${missing.join(", ")}\n`);
  process.exit(1);
}
process.stdout.write("Threat-model evidence verified\n");
