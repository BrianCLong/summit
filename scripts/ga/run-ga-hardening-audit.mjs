#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  classifyCheckResult,
  iconForStatus,
  parseCliArgs,
  summarizeReport,
  truncateOutput,
} from "./lib/hardening-audit.mjs";

const options = parseCliArgs(process.argv.slice(2));

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
    timeout: options.timeoutMs,
  });

  const statusCode = execution.status ?? (execution.error ? 1 : 0);
  const stdout = truncateOutput(execution.stdout ?? "", options.maxOutputChars);
  const stderr = truncateOutput(execution.stderr ?? "", options.maxOutputChars);

  const outcome = classifyCheckResult({
    code: statusCode,
    stdout,
    stderr,
  });

  const result = {
    ...check,
    status: outcome.status,
    reason: outcome.reason,
    exitCode: statusCode,
    timedOut: execution.signal === "SIGTERM",
    durationHint: options.timeoutMs,
  };

  if (options.includeOutput) {
    result.stdout = stdout;
    result.stderr = stderr;
  }

  results.push(result);
  console.log(`${iconForStatus(outcome.status)} ${check.id} (${check.phase}) - ${outcome.reason}`);
}

const summary = summarizeReport(results);
const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  options,
  summary,
  checks: results,
};

const outPath = resolve(process.cwd(), options.outFile);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`\nWrote GA hardening audit report to ${outPath}`);
console.log(
  `Summary: ${summary.passed} passed, ${summary.warning} warning, ${summary.failed} failed.`
);

if (summary.failed > 0 || (options.failOnWarning && summary.warning > 0)) {
  process.exit(1);
}
