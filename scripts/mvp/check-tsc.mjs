#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

console.log("🔎 MVP-0: TypeScript compile check");

try {
  run("pnpm typecheck");
} catch {
  console.log("ℹ️ No `pnpm typecheck` script found or it failed.");
  console.log(
    "➡️ Add a root script `typecheck` (recommended), or adjust scripts/mvp/check-tsc.mjs"
  );
  process.exit(1);
}
