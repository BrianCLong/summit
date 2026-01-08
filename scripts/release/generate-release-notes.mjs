#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TAG = process.env.TAG || process.argv[2];
const OUTPUT_FILE = process.env.OUTPUT_FILE || "RELEASE_NOTES.md";
const DIST_DIR = process.env.DIST_DIR || "dist/release";

/**
 * Groups commits by their conventional commit type.
 * @param {Array<{subject: string, body: string, hash: string}>} commits - A list of commits.
 * @returns {object} An object with keys for each commit type.
 */
export function groupCommits(commits) {
  const groups = {
    "Breaking Changes": [],
    Features: [],
    Fixes: [],
    Other: [],
  };

  for (const commit of commits) {
    const { subject } = commit;
    if (subject.includes("!:")) {
      groups["Breaking Changes"].push(commit);
    } else if (subject.startsWith("feat:")) {
      groups["Features"].push(commit);
    } else if (subject.startsWith("fix:")) {
      groups["Fixes"].push(commit);
    } else {
      groups["Other"].push(commit);
    }
  }

  return groups;
}

// Ensure dist dir exists
if (TAG) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

const extractScript = path.join(__dirname, "extract-changelog-notes.mjs");

function getLastTag(tag) {
  try {
    return execSync(`git describe --tags --abbrev=0 ${tag}^ 2>/dev/null`).toString().trim();
  } catch (e) {
    return "";
  }
}

function getGitRange(tag) {
  const lastTag = getLastTag(tag);
  return lastTag ? `${lastTag}..${tag}` : tag;
}

function generateGitNotes(tag) {
  try {
    try {
      execSync("command -v gh 2>/dev/null");
    } catch (e) {
      throw new Error("gh not found");
    }

    const remoteUrl = execSync("git config --get remote.origin.url").toString().trim();
    let repoInfo = "";
    if (remoteUrl.includes("github.com")) {
      const match = remoteUrl.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
      if (match) {
        repoInfo = `${match[1]}/${match[2]}`;
      }
    }

    if (repoInfo) {
      const cmd = `gh api -X POST "repos/${repoInfo}/releases/generate-notes" -f tag_name="${tag}" --jq .body`;
      const notes = execSync(cmd).toString();
      return { notes, source: "git-gh-api", range: getGitRange(tag) };
    }
  } catch (e) {
    // gh failed or not available
  }

  const range = getGitRange(tag);
  const cmd = `git log --pretty=format:"- %s (%h) - %an" --no-merges "${range}"`;
  try {
    const notes = execSync(cmd).toString();
    const body = `## Changes\n\n${notes}`;
    return { notes: body, source: "git-log", range };
  } catch (e) {
    console.error("Failed to generate git log notes");
    return { notes: "No release notes available.", source: "git-failed", range: "" };
  }
}

function addToStepSummary(message) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + "\n");
    } catch (e) {
      console.error("Failed to write to GITHUB_STEP_SUMMARY", e);
    }
  }
}

function main() {
  if (!TAG) {
    console.error("Error: TAG argument or environment variable is required.");
    process.exit(1);
  }

  console.log(`Generating release notes for ${TAG}...`);

  try {
    const extracted = execSync(`node ${extractScript} ${TAG}`, {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();

    const date = new Date().toISOString().split("T")[0];
    const header = `# ${TAG} (${date})\n\n`;
    const fullNotes = header + extracted;

    fs.writeFileSync(OUTPUT_FILE, fullNotes);

    let usedPath = "CHANGELOG.md";
    if (!fs.existsSync("CHANGELOG.md") && fs.existsSync("docs/CHANGELOG.md")) {
      usedPath = "docs/CHANGELOG.md";
    }

    const metadata = {
      schemaVersion: "1.0.0",
      tag: TAG,
      source: "changelog",
      path: usedPath,
    };

    fs.writeFileSync(path.join(DIST_DIR, "notes-source.json"), JSON.stringify(metadata, null, 2));
    const msg = "Release notes source: changelog (" + usedPath + ")";
    console.log(msg);
    addToStepSummary(msg);
  } catch (e) {
    if (e.status === 3) {
      console.log("Changelog section not found. Falling back to git generation.");

      const { notes, source, range } = generateGitNotes(TAG);

      fs.writeFileSync(OUTPUT_FILE, notes);

      const metadata = {
        schemaVersion: "1.0.0",
        tag: TAG,
        source: "git",
        range: range,
      };
      fs.writeFileSync(path.join(DIST_DIR, "notes-source.json"), JSON.stringify(metadata, null, 2));
      const msg = `Release notes source: git (${range})`;
      console.log(msg);
      addToStepSummary(msg);
    } else {
      console.error("Unexpected error during changelog extraction:", e);
      process.exit(1);
    }
  }

  try {
    const shasum = execSync(`sha256sum ${path.join(DIST_DIR, "notes-source.json")}`)
      .toString()
      .trim();
    fs.appendFileSync(path.join(DIST_DIR, "SHA256SUMS"), shasum + "\n");
  } catch (e) {
    // Ignore
  }
}

// Only run main when executed directly
if (TAG && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
