#!/usr/bin/env node
/**
 * Verify a GA release by re-hashing artifacts and comparing to the manifest.
 *
 * Usage:
 *   node scripts/verify-release-manifest.mjs --tag=v2025.10.07
 *   TAG=v2025.10.07 node scripts/verify-release-manifest.mjs
 *
 * Exits non-zero on any mismatch or missing file.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

function arg(name) {
  const ix = process.argv.findIndex(a => a.startsWith(`--${name}=`));
  return ix >= 0 ? process.argv[ix].split("=")[1] : null;
}

const TAG = arg("tag") || process.env.TAG || (() => {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,".");
  return `v${d}`;
})();

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "dist", `release-manifest-${TAG}.yaml`);

if (!fs.existsSync(manifestPath)) {
  console.error(`❌ Manifest not found: ${manifestPath}`);
  process.exit(2);
}

// Tiny YAML → JSON (matches the structure we emit)
function yamlToJson(yaml) {
  const lines = yaml.split(/\r?\n/);
  const stack = [{ indent: -1, obj: {} }];
  for (const raw of lines) {
    if (!raw || /^\s*#/.test(raw)) continue;
    const indent = raw.match(/^ */)?.[0].length ?? 0;
    const line = raw.trim();
    if (!line) continue;

    while (stack.length && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;

    const m = /^([^:]+):(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();

    if (val === "") {
      parent[key] = {};
      stack.push({ indent, obj: parent[key] });
      continue;
    }
    if (val === "null") val = null;
    else if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (!Number.isNaN(Number(val))) val = Number(val);
    else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/\\"/g, '"');

    parent[key] = val;
  }
  return stack[0].obj;
}

function sha256File(absPath) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(absPath));
  return h.digest("hex");
}

const manifest = yamlToJson(fs.readFileSync(manifestPath, "utf8"));

let failures = 0;
const artifacts = manifest?.artifacts ?? {};
const entries = Object.entries(artifacts).filter(([k]) => k !== "tag");

console.log(`🔎 Verifying ${entries.length} artifact(s) against ${path.relative(ROOT, manifestPath)}...\n`);

for (const [name, meta] of entries) {
  const rel = meta?.path;
  const expected = meta?.sha256 || null;

  if (!rel) {
    console.warn(`⚠️  ${name}: no path listed, skipping`);
    continue;
  }
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`❌ ${name}: missing file at ${rel}`);
    failures++;
    continue;
  }
  if (!expected) {
    console.warn(`⚠️  ${name}: manifest has no sha256 (non-hashed artifact), skipping`);
    continue;
  }

  const actual = sha256File(abs);
  if (actual !== expected) {
    console.error(`❌ ${name}: sha256 mismatch\n    expected: ${expected}\n    actual:   ${actual}`);
    failures++;
  } else {
    console.log(`✅ ${name}: ${rel} (sha256 OK)`);
  }
}

console.log();
if (failures > 0) {
  console.error(`⛔ Verification FAILED with ${failures} mismatch(es).`);
  process.exit(1);
}
console.log("🟢 Verification PASSED. All artifact digests match.");