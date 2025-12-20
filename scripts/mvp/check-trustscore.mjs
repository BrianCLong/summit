#!/usr/bin/env node
import fs from "node:fs";

console.log("🔎 MVP-1: Trust scoring gate");

const candidates = [
  "packages/analytics/src/trustScore.ts",
  "packages/analytics/src/trustScore.tsx",
];

const exists = candidates.some((p) => fs.existsSync(p));
if (!exists) {
  console.error("❌ Missing Trust Score engine module. Expected one of:");
  for (const p of candidates) console.error(`  - ${p}`);
  process.exit(1);
}

console.log("✅ Trust score module exists.");
