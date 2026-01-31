#!/usr/bin/env node
import fs from "node:fs";

// Deny-by-default: fail if any hono/hono-jsx entry resolves to < 4.11.7.
// This is a *lockfile* gate (supply-chain proof), not a runtime test.

const lockPath = process.argv[2] || "pnpm-lock.yaml";
const min = "4.11.7";

function cmp(a, b) {
  const pa = a.split(".").map(n => parseInt(n, 10));
  const pb = b.split(".").map(n => parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0, db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

if (!fs.existsSync(lockPath)) {
  console.error(`[hono-gate] Lockfile not found: ${lockPath}`);
  process.exit(1);
}

const text = fs.readFileSync(lockPath, "utf8");

// pnpm-lock patterns commonly include:
//   /hono@4.11.7:
// and sometimes:
//   hono: 4.11.7
// We'll conservatively scan for explicit hono version mentions.
const hits = [];
const re = /(^|[^a-zA-Z0-9_-])hono@(\d+\.\d+\.\d+)\b/gm;
let m;
while ((m = re.exec(text)) !== null) hits.push(m[2]);

// Also check for hono: x.y.z format
const re2 = /^\s+hono:\s+(\d+\.\d+\.\d+)\b/gm;
while ((m = re2.exec(text)) !== null) hits.push(m[1]);

if (hits.length === 0) {
  console.error(`[hono-gate] No hono@x.y.z entries found in ${lockPath}. Gate cannot verify.`);
  process.exit(1);
}

const bad = [...new Set(hits)].filter(v => cmp(v, min) < 0);
if (bad.length) {
  console.error(`[hono-gate] Vulnerable hono versions found in ${lockPath}: ${bad.join(", ")} (min ${min})`);
  process.exit(1);
}

console.log(`[hono-gate] OK: all detected hono versions are >= ${min}`);
