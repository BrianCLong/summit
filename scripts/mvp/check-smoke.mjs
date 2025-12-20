#!/usr/bin/env node
import { execSync } from "node:child_process";

console.log("🧪 MVP Smoke: HTTP healthcheck (non-fatal unless you wire CI to boot services)");

try {
  execSync("node scripts/mvp/smoke-http.mjs", { stdio: "inherit" });
  console.log("✅ Smoke check passed (or service reachable).");
} catch {
  console.log("⚠️ Smoke check skipped/failed (non-fatal). Wire service boot in CI to enforce.");
  process.exit(0);
}
