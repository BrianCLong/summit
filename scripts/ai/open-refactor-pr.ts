#!/usr/bin/env ts-node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const run = (command: string, args: string[], options: { cwd?: string } = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const error = result.stderr || result.stdout;
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${error}`);
  }
  return result.stdout.trim();
};

const getCurrentBranch = () => run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);

const getDiffStat = () => run("git", ["diff", "--stat"]);

const buildBody = async (diffStat: string) => {
  const policyLink = "docs/dev/ai-refactoring-policy.md";
  const summaryLines = [
    "## Summary",
    "- AI-assisted refactor completed via `scripts/ai/run-refactor.ts`.",
    "- Diffstat (for reviewer sizing):",
    "",
    "```",
    diffStat || "No changes recorded",
    "```",
    "",
    "## Safety Checklist",
    "- [ ] No public API changes without explicit approval.",
    "- [ ] No security-sensitive code paths modified.",
    "- [ ] Lint, typecheck, and scoped tests were executed for the target.",
    "",
    `Refer to [AI-Assisted Refactoring Policy](${policyLink}) for review guidelines.`,
  ];

  await fs.mkdir(path.join(repoRoot, "ai-refactor", "output"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "ai-refactor", "output", "latest-pr-body.md"),
    summaryLines.join("\n"),
    "utf8"
  );
  return summaryLines.join("\n");
};

const createPr = async () => {
  const branch = getCurrentBranch();
  const diffStat = getDiffStat();
  const body = await buildBody(diffStat);

  console.log("Opening PR with diff summary:");
  console.log(diffStat);

  const prTitle = "devex: AI-assisted refactoring pipeline & guardrails";
  const args = ["pr", "create", "--title", prTitle, "--body", body];
  const result = spawnSync("gh", args, { cwd: repoRoot, stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    throw new Error("Failed to open PR via gh CLI");
  }

  console.log(`PR opened from branch ${branch}`);
};

createPr().catch((error) => {
  console.error(error);
  process.exit(1);
});
