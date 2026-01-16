#!/usr/bin/env node
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const evidenceDir = arg("--evidenceDir");
const out = arg("--out");
if (!evidenceDir || !out) {
  process.stderr.write("Usage: emit-policy-input.mjs --evidenceDir <dir> --out <path>\n");
  process.exit(2);
}

function listFiles(root, rel = "") {
  const abs = join(root, rel);
  const entries = readdirSync(abs).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const files = [];
  for (const e of entries) {
    const r = rel ? join(rel, e) : e;
    const s = statSync(join(root, r));
    if (s.isDirectory()) files.push(...listFiles(root, r));
    else files.push(r);
  }
  return files;
}

let present = [];
try {
  present = listFiles(evidenceDir).map((p) => posix.normalize(p.split("\\").join("/")));
} catch {
  present = [];
}

const input = {
  evidence: {
    present,
  },
};

writeFileSync(out, JSON.stringify(input, null, 2) + "\n", "utf8");
