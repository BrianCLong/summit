#!/usr/bin/env node

/**
 * scripts/compliance/check_dco.js
 *
 * Checks if the latest commit message contains a "Signed-off-by" line.
 * Used in CI or pre-commit hooks to enforce DCO.
 *
 * Usage: node scripts/compliance/check_dco.js [commit_msg_file]
 */

const fs = require("fs");
const path = require("path");

const commitMsgFile = process.argv[2];

let commitMsg = "";

if (commitMsgFile) {
  // Read from file (git hook mode)
  try {
    commitMsg = fs.readFileSync(commitMsgFile, "utf8");
  } catch (err) {
    console.error(`Error reading commit message file: ${err.message}`);
    process.exit(1);
  }
} else {
  // Read from git log (CI mode - check HEAD)
  try {
    const { execSync } = require("child_process");
    commitMsg = execSync("git log -1 --pretty=%B", { encoding: "utf8" });
  } catch (err) {
    console.error("Error reading git log:", err.message);
    process.exit(1);
  }
}

const dcoRegex = /^Signed-off-by: .+ <.+@.+>$/m;

if (dcoRegex.test(commitMsg)) {
  console.log("✅ DCO check passed: Signed-off-by present.");
  process.exit(0);
} else {
  console.error('❌ DCO check failed: Missing "Signed-off-by" line.');
  console.error("Please sign your commit using `git commit -s` or add the line manually.");
  console.error("Example: Signed-off-by: Jane Doe <jane.doe@example.com>");
  process.exit(1);
}
