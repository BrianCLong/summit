#!/usr/bin/env node
import fs from "fs";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in") out.in = argv[++i];
    else if (a === "--max-critical") out.maxCritical = Number(argv[++i]);
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!out.in) throw new Error("Missing --in");
  if (!Number.isFinite(out.maxCritical)) throw new Error("Missing --max-critical");
  return out;
}

const args = parseArgs(process.argv);
const report = JSON.parse(fs.readFileSync(args.in, "utf8"));

let critical = 0;

const results = Array.isArray(report.Results) ? report.Results : [];
for (const r of results) {
  const vulns = Array.isArray(r.Vulnerabilities) ? r.Vulnerabilities : [];
  for (const v of vulns) {
    if ((v.Severity || "").toUpperCase() === "CRITICAL") critical++;
  }
}

if (critical > args.maxCritical) {
  process.stderr.write(`Trivy threshold failed: CRITICAL=${critical} > ${args.maxCritical}\n`);
  process.exit(1);
}

process.stdout.write(`Trivy threshold passed: CRITICAL=${critical}\n`);
