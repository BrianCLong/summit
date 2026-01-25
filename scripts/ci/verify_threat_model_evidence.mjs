#!/usr/bin/env node
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

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
const doc = yaml.load(fs.readFileSync(args.tm, "utf8"));

if (!doc || !doc.evidence) {
  process.stdout.write("No evidence required by threat model or empty file.\n");
  process.exit(0);
}

const evidenceList = Array.isArray(doc.evidence) ? doc.evidence : [doc.evidence];
const missing = [];

for (const e of evidenceList) {
  const p = path.resolve(args.dir, e);
  if (!fs.existsSync(p)) {
    missing.push(e);
  }
}

if (missing.length) {
  process.stderr.write(`Threat-model evidence missing: ${missing.join(", ")}\n`);
  process.exit(1);
}

process.stdout.write(`Threat-model evidence verified: ${evidenceList.length} items found.\n`);
