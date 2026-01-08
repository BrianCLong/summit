#!/usr/bin/env node
import process from "node:process";
import { lintMigrations, describeOverrides } from "./linter.js";

function parsePatterns(argv: string[]): string[] | undefined {
  const patternsFlagIndex = argv.findIndex((arg) => arg === "--paths");
  if (patternsFlagIndex === -1) {
    return undefined;
  }

  const value = argv[patternsFlagIndex + 1];
  if (!value) return undefined;
  return value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

async function main() {
  const patterns = parsePatterns(process.argv.slice(2));

  const findings = await lintMigrations({ patterns });
  if (!findings.length) {
    console.log("✅ Migration linter: no destructive changes detected");
    return;
  }

  console.error("❌ Migration linter detected unsafe changes:\n");
  findings.forEach((finding) => {
    console.error(`• ${finding.file}`);
    console.error(`  Rule: ${finding.rule} – ${finding.message}`);
    console.error(`  Remediation: ${finding.remediation}`);
    console.error("");
  });

  console.error(`To override, include an approval annotation. ${describeOverrides()}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("Migration linter failed:", err);
  process.exit(1);
});
