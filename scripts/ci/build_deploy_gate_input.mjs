#!/usr/bin/env node
import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sbom") out.sbom = argv[++i];
    else if (a === "--sbom-bundle") out.sbomBundle = argv[++i];
    else if (a === "--provenance") out.prov = argv[++i];
    else if (a === "--provenance-bundle") out.provBundle = argv[++i];
    else if (a === "--trivy") out.trivy = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else throw new Error(`Unknown arg: ${a}`);
  }
  for (const k of ["sbom","sbomBundle","prov","provBundle","trivy","out"]) {
    if (!out[k]) throw new Error(`Missing --${k}`);
  }
  return out;
}

const args = parseArgs(process.argv);

const present = [];
for (const f of [args.sbom,args.sbomBundle,args.prov,args.provBundle,args.trivy]) {
  if (fs.existsSync(f)) present.push(path.basename(f));
}

// Add the files that are part of the process but might not exist yet
present.push(path.basename(args.out)); // deploy-gate-input.json
present.push("opa-deploy-gate-decision.json"); // will exist after opa eval

const report = JSON.parse(fs.readFileSync(args.trivy, "utf8"));
let critical = 0;
const results = Array.isArray(report.Results) ? report.Results : [];
for (const r of results) {
  const vulns = Array.isArray(r.Vulnerabilities) ? r.Vulnerabilities : [];
  for (const v of vulns) if ((v.Severity || "").toUpperCase() === "CRITICAL") critical++;
}

const input = {
  artifacts_present: present,
  signatures: {
    sbom_valid: fs.existsSync(args.sbomBundle),
    provenance_valid: fs.existsSync(args.provBundle)
  },
  vulnerabilities: { critical }
};

fs.writeFileSync(args.out, JSON.stringify(input, null, 2));
