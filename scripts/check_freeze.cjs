#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Configuration
const SCOPE_FILE = "LAUNCH_SCOPE.md";
const OVERRIDE_TAG = "[launch-override]";

// Read Launch Scope to find frozen paths
function getFrozenPaths() {
  try {
    const content = fs.readFileSync(SCOPE_FILE, "utf8");
    const lines = content.split("\n");
    const frozenPaths = [];
    let inSection = false;

    for (const line of lines) {
      if (line.trim() === "### Frozen Artifacts") {
        inSection = true;
        continue;
      }
      if (inSection && line.startsWith("###")) {
        inSection = false;
        break;
      }
      if (inSection) {
        const match = line.match(/- `(.*?)`/);
        if (match) {
          frozenPaths.push(match[1]);
        }
      }
    }
    return frozenPaths;
  } catch (err) {
    console.error(`Error reading ${SCOPE_FILE}:`, err);
    process.exit(1);
  }
}

// Check if a file is frozen
function isFrozen(filePath, frozenPaths) {
  return frozenPaths.some((frozen) => filePath.startsWith(frozen));
}

// Main execution
async function main() {
  const changedFiles = process.argv.slice(2);
  const commitMessage = process.env.COMMIT_MESSAGE || "";

  if (changedFiles.length === 0) {
    console.log("No files to check.");
    return;
  }

  const frozenPaths = getFrozenPaths();
  console.log("Frozen Paths:", frozenPaths);

  const violations = [];

  for (const file of changedFiles) {
    if (isFrozen(file, frozenPaths)) {
      violations.push(file);
    }
  }

  if (violations.length > 0) {
    if (commitMessage.includes(OVERRIDE_TAG)) {
      console.log(
        "Frozen file violation detected, but override tag present. Proceeding with caution."
      );
      process.exit(0);
    } else {
      console.error("❌ LAUNCH FREEZE VIOLATION");
      console.error("The following frozen files were modified without approval:");
      violations.forEach((v) => console.error(` - ${v}`));
      console.error(`\nTo override, include "${OVERRIDE_TAG}" in your commit message.`);
      process.exit(1);
    }
  } else {
    console.log("✅ No freeze violations.");
  }
}

main();
