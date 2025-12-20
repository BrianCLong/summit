#!/usr/bin/env node
import { execSync } from "node:child_process";
import process from "node:process";

const DEFAULT_TIER = (process.env.DEFAULT_MVP_TIER || "mvp-0").toLowerCase();
const PR_BODY = String(process.env.PR_BODY || "");

const tiers = ["mvp-0", "mvp-1", "mvp-2"];

function detectTierFromBody(body) {
  const m = body.match(/MVP\s*Tier:\s*(MVP-0|MVP-1|MVP-2)/i);
  if (!m) return DEFAULT_TIER;
  return m[1].toLowerCase();
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}

function must(condition, msg) {
  if (!condition) {
    console.error(`\n❌ MVP Gate failed: ${msg}\n`);
    process.exit(1);
  }
}

function tierIndex(t) {
  const i = tiers.indexOf(t);
  return i === -1 ? 0 : i;
}

function printSummary(tier) {
  console.log("\n================ MVP GATE SUMMARY ================");
  console.log(`Tier requested: ${tier}`);
  console.log("Always enforced: MVP-0 baseline (lint/build/test + TS check)");
  if (tierIndex(tier) >= 1) console.log("Also enforced: MVP-1 analytics gates");
  if (tierIndex(tier) >= 2) console.log("Also enforced: MVP-2 governance gates");
  console.log("==================================================\n");
}

const action = process.argv[2] || "run";

if (action === "tier-from-pr") {
  const tier = detectTierFromBody(PR_BODY);
  must(tiers.includes(tier), `Unknown tier: ${tier}`);
  console.log(`Detected tier: ${tier}`);
  process.exit(0);
}

if (action === "summary") {
  const tier = detectTierFromBody(PR_BODY);
  printSummary(tier);
  process.exit(0);
}

if (action === "run") {
  const tier = detectTierFromBody(PR_BODY);
  must(tiers.includes(tier), `Unknown tier: ${tier}`);

  run("node scripts/mvp/check-tsc.mjs");

  if (tierIndex(tier) >= 1) {
    run("node scripts/mvp/check-trustscore.mjs");
  }

  if (tierIndex(tier) >= 2) {
    run("node scripts/mvp/check-invariants.mjs");
  }

  run("node scripts/mvp/check-smoke.mjs");

  printSummary(tier);
  console.log("✅ MVP Gate passed.\n");
  process.exit(0);
}

console.error(`Unknown action: ${action}`);
process.exit(2);
