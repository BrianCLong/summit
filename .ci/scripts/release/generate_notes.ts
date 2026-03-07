#!/usr/bin/env ts-node
/**
 * Release Notes Generator
 *
 * Generates comprehensive release notes from git commits and PR metadata.
 * Includes sections for:
 * - Highlights
 * - Breaking changes
 * - Migrations
 * - Security/SBOM
 * - SLO/Perf deltas
 * - Known issues
 * - Rollback plan
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface Args {
  lastTag: string;
  version: string;
  bumpType: string;
  output: string;
}

interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  body: string;
  type: string | null;
  scope: string | null;
  breaking: boolean;
  prNumber: string | null;
  labels: string[];
}

interface ReleaseNotes {
  version: string;
  date: string;
  highlights: string[];
  breaking: Commit[];
  features: Commit[];
  fixes: Commit[];
  migrations: Commit[];
  security: Commit[];
  performance: Commit[];
  other: Commit[];
  knownIssues: string[];
}

function parseArgs(): Args {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].replace("--", "");
      args[key] = argv[i + 1] || "";
      i++;
    }
  }

  return {
    lastTag: args["last-tag"] || "v0.0.0",
    version: args["version"] || "0.0.1",
    bumpType: args["bump-type"] || "patch",
    output: args["output"] || "release-notes.md",
  };
}

function execGit(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function getCommitsSinceTag(tag: string): Commit[] {
  const shas = execGit(`git log ${tag}..HEAD --format=%H`).split("\n").filter(Boolean);

  return shas.map((sha) => {
    const shortSha = sha.substring(0, 7);
    const fullMessage = execGit(`git log -1 --format=%B ${sha}`);
    const [message, ...bodyParts] = fullMessage.split("\n\n");
    const body = bodyParts.join("\n\n");

    // Parse conventional commit
    const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)$/i);
    let type: string | null = null;
    let scope: string | null = null;
    let breaking = false;

    if (conventionalMatch) {
      type = conventionalMatch[1].toLowerCase();
      scope = conventionalMatch[2] || null;
      breaking = conventionalMatch[3] === "!";
    }

    // Check for breaking change in body
    if (body.includes("BREAKING CHANGE:") || body.includes("BREAKING-CHANGE:")) {
      breaking = true;
    }

    // Extract PR number from merge commits
    const prMatch = message.match(/\(#(\d+)\)$/);
    const prNumber = prMatch ? prMatch[1] : null;

    // Get labels from PR if available
    let labels: string[] = [];
    if (prNumber) {
      try {
        const labelsJson = execGit(
          `gh pr view ${prNumber} --json labels --jq '.labels[].name' 2>/dev/null`
        );
        labels = labelsJson.split("\n").filter(Boolean);
      } catch {
        // Ignore errors fetching PR labels
      }
    }

    return {
      sha,
      shortSha,
      message,
      body,
      type,
      scope,
      breaking,
      prNumber,
      labels,
    };
  });
}

function categorizeCommits(
  commits: Commit[]
): ReleaseNotes[
  | "breaking"
  | "features"
  | "fixes"
  | "migrations"
  | "security"
  | "performance"
  | "other"][] {
  const breaking: Commit[] = [];
  const features: Commit[] = [];
  const fixes: Commit[] = [];
  const migrations: Commit[] = [];
  const security: Commit[] = [];
  const performance: Commit[] = [];
  const other: Commit[] = [];

  for (const commit of commits) {
    // Check for security-related
    if (
      commit.labels.includes("security") ||
      commit.scope === "security" ||
      commit.message.toLowerCase().includes("security")
    ) {
      security.push(commit);
      continue;
    }

    // Check for migrations
    if (
      commit.labels.includes("migration") ||
      commit.scope === "db" ||
      commit.scope === "migration" ||
      commit.message.toLowerCase().includes("migration")
    ) {
      migrations.push(commit);
      continue;
    }

    // Check for performance
    if (
      commit.labels.includes("performance") ||
      commit.type === "perf" ||
      commit.message.toLowerCase().includes("performance")
    ) {
      performance.push(commit);
      continue;
    }

    // Breaking changes
    if (commit.breaking) {
      breaking.push(commit);
      continue;
    }

    // Standard categorization
    switch (commit.type) {
      case "feat":
        features.push(commit);
        break;
      case "fix":
        fixes.push(commit);
        break;
      default:
        other.push(commit);
    }
  }

  return [breaking, features, fixes, migrations, security, performance, other];
}

function extractHighlights(commits: Commit[]): string[] {
  const highlights: string[] = [];

  // Look for user-visible changes
  for (const commit of commits) {
    if (commit.labels.includes("user-visible") || commit.labels.includes("highlight")) {
      highlights.push(commit.message);
    }
  }

  // If no explicit highlights, use top features
  if (highlights.length === 0) {
    const features = commits.filter((c) => c.type === "feat").slice(0, 3);
    for (const feat of features) {
      highlights.push(feat.message);
    }
  }

  return highlights;
}

function formatCommit(commit: Commit): string {
  const prLink = commit.prNumber ? ` ([#${commit.prNumber}](../../pull/${commit.prNumber}))` : "";
  return `- ${commit.message}${prLink} (\`${commit.shortSha}\`)`;
}

function generateMarkdown(notes: ReleaseNotes, bumpType: string): string {
  const lines: string[] = [];

  lines.push(`# Release v${notes.version}`);
  lines.push("");
  lines.push(`**Release Date**: ${notes.date}`);
  lines.push(`**Release Type**: ${bumpType.charAt(0).toUpperCase() + bumpType.slice(1)}`);
  lines.push("");

  // Highlights
  if (notes.highlights.length > 0) {
    lines.push("## Highlights");
    lines.push("");
    for (const highlight of notes.highlights) {
      lines.push(`- ${highlight}`);
    }
    lines.push("");
  }

  // Breaking Changes (always show if present)
  if (notes.breaking.length > 0) {
    lines.push("## Breaking Changes");
    lines.push("");
    lines.push("> **Important**: These changes may require updates to your code or configuration.");
    lines.push("");
    for (const commit of notes.breaking) {
      lines.push(formatCommit(commit));
      if (commit.body) {
        const details = commit.body
          .split("\n")
          .filter((l) => l.startsWith("BREAKING CHANGE:"))
          .map((l) => l.replace("BREAKING CHANGE:", "").trim());
        for (const detail of details) {
          lines.push(`  - ${detail}`);
        }
      }
    }
    lines.push("");
  }

  // Migrations
  if (notes.migrations.length > 0) {
    lines.push("## Migrations");
    lines.push("");
    lines.push("> **Note**: Database migrations included in this release.");
    lines.push("");
    for (const commit of notes.migrations) {
      lines.push(formatCommit(commit));
    }
    lines.push("");
    lines.push("### Migration Instructions");
    lines.push("");
    lines.push("```bash");
    lines.push("# Apply migrations before deploying");
    lines.push("pnpm db:pg:migrate");
    lines.push("pnpm db:neo4j:migrate");
    lines.push("```");
    lines.push("");
  }

  // Features
  if (notes.features.length > 0) {
    lines.push("## Features");
    lines.push("");
    for (const commit of notes.features) {
      lines.push(formatCommit(commit));
    }
    lines.push("");
  }

  // Bug Fixes
  if (notes.fixes.length > 0) {
    lines.push("## Bug Fixes");
    lines.push("");
    for (const commit of notes.fixes) {
      lines.push(formatCommit(commit));
    }
    lines.push("");
  }

  // Security
  if (notes.security.length > 0) {
    lines.push("## Security");
    lines.push("");
    for (const commit of notes.security) {
      lines.push(formatCommit(commit));
    }
    lines.push("");
    lines.push("### SBOM");
    lines.push("");
    lines.push("Software Bill of Materials (SBOM) is attached to this release.");
    lines.push("");
  }

  // Performance
  if (notes.performance.length > 0) {
    lines.push("## Performance");
    lines.push("");
    for (const commit of notes.performance) {
      lines.push(formatCommit(commit));
    }
    lines.push("");
  }

  // SLO/Perf Deltas
  lines.push("## SLO & Performance Status");
  lines.push("");
  lines.push("| Metric | Target | Current | Status |");
  lines.push("|--------|--------|---------|--------|");
  lines.push("| Availability | 99.9% | TBD | - |");
  lines.push("| P95 Latency | < 500ms | TBD | - |");
  lines.push("| Error Rate | < 1% | TBD | - |");
  lines.push("");
  lines.push("> Full SLO report will be available after stage validation.");
  lines.push("");

  // Known Issues
  if (notes.knownIssues.length > 0) {
    lines.push("## Known Issues");
    lines.push("");
    for (const issue of notes.knownIssues) {
      lines.push(`- ${issue}`);
    }
    lines.push("");
  }

  // Rollback Plan
  lines.push("## Rollback Plan");
  lines.push("");
  lines.push("If issues are detected after deployment, follow these steps:");
  lines.push("");
  lines.push("```bash");
  lines.push("# Trigger rollback via GitHub Actions");
  lines.push("gh workflow run release-promote.yml \\");
  lines.push(`  -f version=${notes.version} \\`);
  lines.push("  -f action=rollback \\");
  lines.push("  -f rollback_to=<previous_version>");
  lines.push("```");
  lines.push("");
  lines.push(
    "For detailed rollback procedures, see [RUNBOOKS/release-captain.md](../RUNBOOKS/release-captain.md)."
  );
  lines.push("");

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Generated by Release Train on ${notes.date}*`);

  return lines.join("\n");
}

async function main() {
  const args = parseArgs();

  console.log(`Generating release notes for v${args.version}...`);
  console.log(`Last tag: ${args.lastTag}`);
  console.log(`Bump type: ${args.bumpType}`);

  // Get commits
  const commits = getCommitsSinceTag(args.lastTag);
  console.log(`Found ${commits.length} commits`);

  // Categorize commits
  const [breaking, features, fixes, migrations, security, performance, other] =
    categorizeCommits(commits);

  // Extract highlights
  const highlights = extractHighlights(commits);

  // Build notes structure
  const notes: ReleaseNotes = {
    version: args.version,
    date: new Date().toISOString().split("T")[0],
    highlights,
    breaking,
    features,
    fixes,
    migrations,
    security,
    performance,
    other,
    knownIssues: [], // Could be populated from GitHub issues with specific labels
  };

  // Generate markdown
  const markdown = generateMarkdown(notes, args.bumpType);

  // Write output
  const outputPath = path.resolve(args.output);
  fs.writeFileSync(outputPath, markdown, "utf-8");
  console.log(`Release notes written to: ${outputPath}`);
}

main().catch((error) => {
  console.error("Error generating release notes:", error);
  process.exit(1);
});
