#!/usr/bin/env tsx
/**
 * Verification Suite - Deterministic structure and GA feature verification
 *
 * Purpose: Run all verification checks without requiring full Jest setup
 * - Uses tsx for direct TypeScript execution
 * - Verifies GA features (Auth, Rate Limits, Policies, Evidence)
 * - Runs structural checks (route registration, config schemas)
 * - Fast, deterministic, CI-friendly
 *
 * Why separate from Jest:
 * - Jest ESM transforms are brittle for verification-style tests
 * - These tests verify structure/shape, not unit behavior
 * - Faster execution without Jest overhead
 * - Explicit dependency management
 *
 * Usage:
 *   pnpm verify
 *   tsx scripts/verify.ts
 *   tsx scripts/verify.ts --filter auth
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

interface VerificationCheck {
  name: string;
  category: "ga-feature" | "security" | "structure";
  script: string;
  required: boolean; // If true, failure blocks CI
}

// Define all verification checks
const VERIFICATION_CHECKS: VerificationCheck[] = [
  // GA Features (Tier B requirements)
  {
    name: "Authentication Logic",
    category: "ga-feature",
    script: "server/scripts/verify_auth.ts",
    required: true,
  },
  {
    name: "Route Rate Limiting",
    category: "ga-feature",
    script: "server/scripts/verify-route-rate-limit.ts",
    required: true,
  },
  {
    name: "Policy Lifecycle",
    category: "ga-feature",
    script: "server/scripts/verify_policy_lifecycle.ts",
    required: true,
  },
  {
    name: "Policy Simulation",
    category: "ga-feature",
    script: "server/scripts/verify_policy_simulation.ts",
    required: true,
  },
  {
    name: "Evidence Scoring",
    category: "ga-feature",
    script: "server/scripts/verify-evidence-scoring.ts",
    required: true,
  },
  {
    name: "XAI v2 Integration",
    category: "ga-feature",
    script: "server/scripts/verify-xai-v2.ts",
    required: true,
  },

  // Security Verifications
  {
    name: "Middleware Coverage",
    category: "security",
    script: "server/scripts/verify-middleware-coverage.ts",
    required: true,
  },

  // Structural Verifications
  {
    name: "Revenue Ops Structure",
    category: "structure",
    script: "server/scripts/verify_revenue_ops_structure.ts",
    required: false,
  },
];

// Parse CLI arguments
const args = process.argv.slice(2);
const filterArg = args.find((arg) => arg.startsWith("--filter="));
const filter = filterArg ? filterArg.split("=")[1] : null;
const verboseMode = args.includes("--verbose") || args.includes("-v");

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : "";
  console.log(`${colorCode}${message}${colors.reset}`);
}

function logHeader(message: string) {
  console.log("");
  log("=".repeat(80), "cyan");
  log(message, "bright");
  log("=".repeat(80), "cyan");
  console.log("");
}

async function runVerification(check: VerificationCheck): Promise<boolean> {
  const scriptPath = join(ROOT_DIR, check.script);

  log(`▶ Running: ${check.name}`, "blue");
  if (verboseMode) {
    log(`  Script: ${check.script}`, "cyan");
    log(`  Category: ${check.category}`, "cyan");
    log(`  Required: ${check.required}`, "cyan");
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn("tsx", [scriptPath], {
      cwd: ROOT_DIR,
      stdio: verboseMode ? "inherit" : "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    let stdout = "";
    let stderr = "";

    if (!verboseMode) {
      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("close", (code) => {
      const duration = Date.now() - startTime;

      if (code === 0) {
        log(`  ✓ ${check.name} passed (${duration}ms)`, "green");
        resolve(true);
      } else {
        log(`  ✗ ${check.name} FAILED (${duration}ms)`, "red");

        if (!verboseMode && (stdout || stderr)) {
          log("\n  Output:", "yellow");
          if (stdout) console.log(stdout);
          if (stderr) console.error(stderr);
        }

        resolve(false);
      }
    });

    child.on("error", (error) => {
      log(`  ✗ ${check.name} ERROR: ${error.message}`, "red");
      resolve(false);
    });
  });
}

async function main() {
  logHeader("🔍 Verification Suite - Summit Repository");

  // Filter checks if requested
  let checksToRun = VERIFICATION_CHECKS;
  if (filter) {
    checksToRun = VERIFICATION_CHECKS.filter(
      (check) =>
        check.name.toLowerCase().includes(filter.toLowerCase()) ||
        check.category.toLowerCase().includes(filter.toLowerCase())
    );

    if (checksToRun.length === 0) {
      log(`No checks match filter: ${filter}`, "yellow");
      process.exit(0);
    }

    log(`Filtering checks: ${filter}`, "yellow");
    log(`Found ${checksToRun.length} matching checks\n`, "yellow");
  }

  log(`Running ${checksToRun.length} verification checks...\n`);

  const results: { check: VerificationCheck; passed: boolean }[] = [];

  // Run all checks sequentially for clear output
  for (const check of checksToRun) {
    const passed = await runVerification(check);
    results.push({ check, passed });
  }

  // Summary
  logHeader("📊 Verification Summary");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const requiredFailed = results.filter((r) => !r.passed && r.check.required).length;

  log(`Total checks: ${results.length}`, "cyan");
  log(`Passed: ${passed}`, "green");
  log(`Failed: ${failed}`, failed > 0 ? "red" : "green");
  console.log("");

  // Show failures
  if (failed > 0) {
    log("Failed checks:", "red");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        const marker = r.check.required ? "[REQUIRED]" : "[OPTIONAL]";
        log(`  ${marker} ${r.check.name} (${r.check.category})`, "red");
      });
    console.log("");
  }

  // Exit code logic
  if (requiredFailed > 0) {
    log(`❌ ${requiredFailed} required check(s) failed - CI BLOCKED`, "red");
    process.exit(1);
  } else if (failed > 0) {
    log(`⚠️  ${failed} optional check(s) failed - CI OK`, "yellow");
    process.exit(0);
  } else {
    log("✅ All verification checks passed!", "green");
    process.exit(0);
  }
}

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
