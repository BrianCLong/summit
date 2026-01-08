#!/usr/bin/env node

/**
 * Generate Changelog Script
 *
 * Generates changelog entries from conventional commits.
 * Can be used manually or as part of the release process.
 *
 * Usage:
 *   node scripts/generate-changelog.js [options]
 *
 * Options:
 *   --from <tag>     Start from this tag (default: latest tag)
 *   --to <ref>       End at this ref (default: HEAD)
 *   --output <file>  Output file (default: stdout)
 *   --format <fmt>   Format: markdown, json, plain (default: markdown)
 *   --dry-run        Preview without writing to file
 *   --help           Show help
 *
 * Examples:
 *   # Preview changes since last tag
 *   node scripts/generate-changelog.js --dry-run
 *
 *   # Generate changelog for specific range
 *   node scripts/generate-changelog.js --from v1.0.0 --to v1.1.0
 *
 *   # Append to CHANGELOG.md
 *   node scripts/generate-changelog.js --output CHANGELOG.md
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// Configuration
const CONFIG = {
  types: {
    feat: { title: "Features", emoji: "" },
    fix: { title: "Bug Fixes", emoji: "" },
    perf: { title: "Performance Improvements", emoji: "" },
    refactor: { title: "Code Refactoring", emoji: "" },
    docs: { title: "Documentation", emoji: "" },
    style: { title: "Styles", emoji: "" },
    test: { title: "Tests", emoji: "" },
    build: { title: "Build System", emoji: "" },
    ci: { title: "CI/CD", emoji: "" },
    chore: { title: "Chores", emoji: "" },
    revert: { title: "Reverts", emoji: "" },
  },
  scopes: {
    api: "API",
    web: "Web",
    server: "Server",
    client: "Client",
    db: "Database",
    graph: "Graph",
    auth: "Authentication",
    ci: "CI/CD",
    deps: "Dependencies",
  },
};

// Parse command-line arguments
function parseArgs(args) {
  const options = {
    from: null,
    to: "HEAD",
    output: null,
    format: "markdown",
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--from":
        options.from = args[++i];
        break;
      case "--to":
        options.to = args[++i];
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--format":
        options.format = args[++i];
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Generate Changelog Script

Generates changelog entries from conventional commits.

Usage:
  node scripts/generate-changelog.js [options]

Options:
  --from <tag>     Start from this tag (default: latest tag)
  --to <ref>       End at this ref (default: HEAD)
  --output <file>  Output file (default: stdout)
  --format <fmt>   Format: markdown, json, plain (default: markdown)
  --dry-run        Preview without writing to file
  --help           Show this help message

Examples:
  # Preview changes since last tag
  node scripts/generate-changelog.js --dry-run

  # Generate changelog for specific range
  node scripts/generate-changelog.js --from v1.0.0 --to v1.1.0

  # Output to CHANGELOG.md
  node scripts/generate-changelog.js --output CHANGELOG.md
`);
}

// Execute git command
function git(command) {
  try {
    return execSync(`git ${command}`, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    }).trim();
  } catch (error) {
    return null;
  }
}

// Get the latest tag
function getLatestTag() {
  return git("describe --tags --abbrev=0 2>/dev/null") || null;
}

// Get commits between two refs
function getCommits(from, to) {
  const range = from ? `${from}..${to}` : to;
  const format = "%H|%s|%b|%an|%ae|%ai";
  const log = git(`log ${range} --pretty=format:"${format}" --no-merges`);

  if (!log) return [];

  return log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, subject, body, authorName, authorEmail, date] = line.split("|");
      return { hash, subject, body, authorName, authorEmail, date };
    });
}

// Parse conventional commit
function parseCommit(commit) {
  const conventionalRegex =
    /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+)$/;
  const match = commit.subject.match(conventionalRegex);

  if (!match) {
    return null;
  }

  const { type, scope, breaking, description } = match.groups;

  // Check for BREAKING CHANGE in body
  const isBreaking = breaking === "!" || (commit.body && /BREAKING CHANGE[S]?:/i.test(commit.body));

  return {
    ...commit,
    type,
    scope: scope || null,
    description,
    isBreaking,
  };
}

// Group commits by type
function groupCommits(commits) {
  const groups = {};
  const breaking = [];

  for (const commit of commits) {
    const parsed = parseCommit(commit);
    if (!parsed) continue;

    if (parsed.isBreaking) {
      breaking.push(parsed);
    }

    if (!groups[parsed.type]) {
      groups[parsed.type] = [];
    }
    groups[parsed.type].push(parsed);
  }

  return { groups, breaking };
}

// Format commit for markdown
function formatCommitMarkdown(commit) {
  const scope = commit.scope ? `**${commit.scope}:** ` : "";
  const hash = commit.hash.substring(0, 7);
  return `- ${scope}${commit.description} (${hash})`;
}

// Generate markdown changelog
function generateMarkdown(groups, breaking, from, to) {
  const lines = [];
  const date = new Date().toISOString().split("T")[0];
  const version = to === "HEAD" ? "Unreleased" : to;

  lines.push(`## [${version}] - ${date}`);
  lines.push("");

  // Breaking changes first
  if (breaking.length > 0) {
    lines.push("### BREAKING CHANGES");
    lines.push("");
    for (const commit of breaking) {
      lines.push(formatCommitMarkdown(commit));
    }
    lines.push("");
  }

  // Other changes by type
  for (const [type, typeConfig] of Object.entries(CONFIG.types)) {
    const commits = groups[type];
    if (!commits || commits.length === 0) continue;

    // Skip non-user-facing types in changelog
    if (["style", "test", "chore"].includes(type)) continue;

    lines.push(`### ${typeConfig.emoji} ${typeConfig.title}`);
    lines.push("");
    for (const commit of commits) {
      lines.push(formatCommitMarkdown(commit));
    }
    lines.push("");
  }

  if (from) {
    lines.push(
      `**Full Changelog**: https://github.com/BrianCLong/summit/compare/${from}...${version}`
    );
    lines.push("");
  }

  return lines.join("\n");
}

// Generate JSON output
function generateJson(groups, breaking, from, to) {
  return JSON.stringify(
    {
      version: to === "HEAD" ? "unreleased" : to,
      date: new Date().toISOString(),
      range: { from, to },
      breaking,
      changes: groups,
    },
    null,
    2
  );
}

// Generate plain text output
function generatePlain(groups, breaking, from, to) {
  const lines = [];
  const version = to === "HEAD" ? "Unreleased" : to;

  lines.push(`Changes for ${version}`);
  lines.push("=".repeat(40));
  lines.push("");

  if (breaking.length > 0) {
    lines.push("BREAKING CHANGES:");
    for (const commit of breaking) {
      lines.push(`  - ${commit.description}`);
    }
    lines.push("");
  }

  for (const [type, typeConfig] of Object.entries(CONFIG.types)) {
    const commits = groups[type];
    if (!commits || commits.length === 0) continue;

    lines.push(`${typeConfig.title}:`);
    for (const commit of commits) {
      const scope = commit.scope ? `[${commit.scope}] ` : "";
      lines.push(`  - ${scope}${commit.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// Insert changelog entry into existing file
function insertIntoChangelog(content, filePath) {
  const changelogPath = resolve(PROJECT_ROOT, filePath);

  if (!existsSync(changelogPath)) {
    // Create new changelog
    const header = `# Changelog

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

`;
    return header + content;
  }

  // Read existing changelog
  const existing = readFileSync(changelogPath, "utf8");

  // Find insertion point (after header, before first version entry)
  const headerEnd = existing.indexOf("## [");
  if (headerEnd === -1) {
    // No existing versions, append to end
    return existing + "\n" + content;
  }

  // Insert before first version
  return existing.slice(0, headerEnd) + content + "\n" + existing.slice(headerEnd);
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.error("Generating changelog...");

  // Determine range
  const from = options.from || getLatestTag();
  const to = options.to;

  console.error(`Range: ${from || "(beginning)"} -> ${to}`);

  // Get and parse commits
  const commits = getCommits(from, to);
  console.error(`Found ${commits.length} commits`);

  if (commits.length === 0) {
    console.error("No commits found in range");
    process.exit(0);
  }

  // Group commits
  const { groups, breaking } = groupCommits(commits);

  // Generate output
  let output;
  switch (options.format) {
    case "json":
      output = generateJson(groups, breaking, from, to);
      break;
    case "plain":
      output = generatePlain(groups, breaking, from, to);
      break;
    case "markdown":
    default:
      output = generateMarkdown(groups, breaking, from, to);
  }

  // Output
  if (options.dryRun) {
    console.log("\n--- DRY RUN OUTPUT ---\n");
    console.log(output);
    console.log("\n--- END DRY RUN ---");
  } else if (options.output) {
    const filePath = resolve(PROJECT_ROOT, options.output);

    if (options.format === "markdown" && options.output.endsWith(".md")) {
      // Insert into existing changelog
      const content = insertIntoChangelog(output, options.output);
      writeFileSync(filePath, content);
    } else {
      writeFileSync(filePath, output);
    }

    console.error(`Written to: ${filePath}`);
  } else {
    console.log(output);
  }
}

// Run
main();
