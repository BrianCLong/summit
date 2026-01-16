#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const dir = arg("--dir");
const manifestPath = arg("--manifest");
if (!dir || !manifestPath) {
  process.stderr.write("Usage: verify-evidence-manifest.mjs --dir <evidenceDir> --manifest <manifest.json>\n");
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const sha256 = manifest?.evidence?.sha256 || {};
const present = manifest?.evidence?.present || [];

function sha256File(absPath) {
  const h = createHash("sha256");
  h.update(readFileSync(absPath));
  return h.digest("hex");
}

let ok = true;
for (const rel of present) {
  const abs = join(dir, rel);
  try {
    const s = statSync(abs);
    if (!s.isFile()) throw new Error("not a file");
  } catch (e) {
    process.stderr.write(`Missing file referenced by manifest: ${rel}\n`);
    ok = false;
    continue;
  }
  const actual = sha256File(abs);
  const expected = sha256[rel];
  if (actual !== expected) {
    process.stderr.write(`Hash mismatch for ${rel}\nExpected: ${expected}\nActual:   ${actual}\n`);
    ok = false;
  }
}

if (!ok) process.exit(1);
process.stdout.write("Evidence manifest verified.\n");
