#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const dir = arg("--dir");
const out = arg("--out");
if (!dir || !out) {
  process.stderr.write("Usage: emit-evidence-manifest.mjs --dir <evidenceDir> --out <manifestPath>\n");
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

function sha256File(absPath) {
  const h = createHash("sha256");
  h.update(readFileSync(absPath));
  return h.digest("hex");
}

const present = listFiles(dir).map((p) => posix.normalize(p.split("\\").join("/")));

const sha256 = {};
for (const p of present) {
  sha256[p] = sha256File(join(dir, p));
}

const manifest = {
  schema: "summit.evidence-manifest/1.0",
  evidence: {
    present,
    sha256,
  },
};

writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n", "utf8");
