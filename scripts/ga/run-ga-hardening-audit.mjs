#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { classifyCheckResult, summarizeReport } from "./lib/hardening-audit.mjs";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outFile = outIndex >= 0 ? args[outIndex + 1] : "artifacts/ga-hardening-audit.json";
const failOnWarning = args.includes("--fail-on-warning");

const checks = [
  {
    id: "security:check",
    command: "pnpm security:check",
    phase: "security",
  },
  {
    id: "audit:production",
    command: "pnpm audit --prod --json",
    phase: "security",
  },
  {
    id: "dependency:outdated",
    command: "pnpm outdated --recursive",
    phase: "dependencies",
  },
  {
    id: "lint",
    command: "pnpm lint",
    phase: "quality",
  },
  {
    id: "typecheck",
    command: "pnpm typecheck",
    phase: "quality",
  },
  {
    id: "test",
    command: "pnpm test",
    phase: "reliability",
  },
];

const results = [];

for (const check of checks) {
  const execution = spawnSync(check.command, {
    shell: true,
    encoding: "utf8",
    stdio: "pipe",
  });

  const outcome = classifyCheckResult({
    code: execution.status ?? 1,
    stdout: execution.stdout,
    stderr: execution.stderr,
  });

  const result = {
    ...check,
    status: outcome.status,
    reason: outcome.reason,
    exitCode: execution.status,
    stdout: execution.stdout,
    stderr: execution.stderr,
  };

  results.push(result);
  const icon = outcome.status === "passed" ? "✅" : outcome.status === "warning" ? "⚠️" : "❌";
  console.log(`${icon} ${check.id} (${check.phase}) - ${outcome.reason}`);
}

const summary = summarizeReport(results);
const report = {
  generatedAt: new Date().toISOString(),
  summary,
  checks: results.map(({ stdout, stderr, ...rest }) => rest),
};

const outPath = resolve(process.cwd(), outFile);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`\nWrote GA hardening audit report to ${outPath}`);
console.log(
  `Summary: ${summary.passed} passed, ${summary.warning} warnings, ${summary.failed} failed.`
);

if (summary.failed > 0 || (failOnWarning && summary.warning > 0)) {
  process.exit(1);
}
