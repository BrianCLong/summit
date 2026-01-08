#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface ParsedArgs {
  changedFiles: string[];
  format: "text" | "markdown";
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let changedFiles: string[] = [];
  let format: "text" | "markdown" = "text";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--changed-files" && args[i + 1]) {
      changedFiles = args[i + 1]
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      i++;
    } else if (args[i] === "--base-ref" && args[i + 1]) {
      const baseRef = args[i + 1];
      try {
        const diff = execSync(`git diff --name-only ${baseRef}...HEAD`, {
          encoding: "utf-8",
        });
        changedFiles = diff.split("\n").filter((f) => f.trim().length > 0);
      } catch (error) {
        console.error("Failed to compute diff for design enforcement:", error);
      }
      i++;
    } else if (args[i] === "--format" && args[i + 1]) {
      const value = args[i + 1].toLowerCase();
      if (value === "markdown") {
        format = "markdown";
      }
      i++;
    }
  }

  return { changedFiles, format };
}

function isDesignFile(file: string): boolean {
  const patterns = [
    /^adr\/.+\.md$/,
    /^docs\/.*design.*\.md$/i,
    /^docs\/architecture\/.+\.md$/,
    /^docs\/arch\/.+\.md$/,
  ];

  return patterns.some((pattern) => pattern.test(file));
}

function hasThreatModelReference(filePath: string): boolean {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const threatModelRegex = /threat model/i;
  const supplyChainRegex = /supply chain|third-party|insider/i;
  return threatModelRegex.test(content) && supplyChainRegex.test(content);
}

function formatOutput(violations: string[], format: "text" | "markdown"): string {
  if (violations.length === 0) {
    return format === "markdown"
      ? "> **Status**: All design artifacts reference threat models."
      : "All design artifacts reference threat models.";
  }

  if (format === "markdown") {
    const lines = ["## Threat Model Design Gate", "", "> **Status**: Action Required", ""];
    for (const violation of violations) {
      lines.push(`- ${violation}`);
    }
    lines.push("");
    lines.push(
      "Run `npx ts-node scripts/security/enforce-threat-model-design.ts --changed-files <files>` to re-check."
    );
    return lines.join("\n");
  }

  return ["Threat model design enforcement failed:", ...violations].join("\n");
}

function main(): void {
  const { changedFiles, format } = parseArgs();

  if (changedFiles.length === 0) {
    console.log("No changed files specified. Use --changed-files or --base-ref");
    process.exit(0);
  }

  const designFiles = changedFiles.filter(isDesignFile);
  const violations: string[] = [];

  if (designFiles.length === 0) {
    console.log("No design/ADR artifacts detected.");
    process.exit(0);
  }

  if (!changedFiles.includes("docs/security/THREAT_MODEL_INDEX.md")) {
    violations.push("Update docs/security/THREAT_MODEL_INDEX.md when design artifacts change.");
  }

  for (const file of designFiles) {
    if (!hasThreatModelReference(file)) {
      violations.push(`${file}: add a threat model reference (SC/TP/IN coverage required).`);
    }
  }

  const output = formatOutput(violations, format);
  console.log(output);

  if (violations.length > 0) {
    process.exit(1);
  }
}

main();
