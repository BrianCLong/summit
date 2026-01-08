#!/usr/bin/env node
import fs from "node:fs";

console.log("🔎 MVP-2: Invariant enforcement gate");

const required = ["packages/governance/src/invariants.ts", "packages/governance/src/middleware.ts"];

for (const p of required) {
  if (!fs.existsSync(p)) {
    console.error(`❌ Missing required MVP-2 governance file: ${p}`);
    process.exit(1);
  }
}

console.log("✅ Invariant enforcement modules exist.");
