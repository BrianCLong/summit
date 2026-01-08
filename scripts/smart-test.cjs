#!/usr/bin/env node
const { execSync } = require("child_process");

// Mappings of paths to test commands
const TEST_MAP = [
  { path: "server", command: "npm run test:server", name: "Server Tests" },
  { path: "client", command: "npm run test:client", name: "Client Tests" },
  { path: "apps/web", command: "npm run test:web", name: "Web App Tests" },
  // If packages change, run all tests (or we could be more granular)
  { path: "packages", command: "npm run test", name: "All Tests (Package Change)" },
];

function getChangedFiles() {
  try {
    // Get diff against main branch
    // If we are on main, or in a detached state, this might fail or show nothing.
    // We assume we are in a PR or feature branch.
    // Try 'origin/main'
    const diffCommand = "git diff --name-only origin/main...HEAD";
    const output = execSync(diffCommand, { encoding: "utf-8" });
    return output.split("\n").filter(Boolean);
  } catch (error) {
    console.warn(
      "⚠️ Could not diff against origin/main (maybe in detached HEAD or no upstream). Falling back to running all tests."
    );
    return null;
  }
}

function determineTests(changedFiles) {
  if (!changedFiles) return null; // Run all

  const testsToRun = new Set();
  let runAll = false;

  changedFiles.forEach((file) => {
    // Root level changes usually imply running everything
    if (file === "package.json" || file === "pnpm-lock.yaml") {
      runAll = true;
    }

    TEST_MAP.forEach((test) => {
      if (file.startsWith(test.path)) {
        testsToRun.add(test);
      }
    });
  });

  if (runAll) return null;
  return Array.from(testsToRun);
}

function runTests() {
  console.log("🔍 Smart Test: Analyzing changes...");

  const changedFiles = getChangedFiles();

  if (changedFiles) {
    console.log(`📝 Detected ${changedFiles.length} changed files.`);
  }

  const tests = determineTests(changedFiles);

  if (!tests) {
    console.log("⚠️ Global changes detected or unable to determine scope. Running ALL tests.");
    try {
      execSync("npm run test", { stdio: "inherit" });
    } catch (e) {
      process.exit(1);
    }
  } else if (tests.length === 0) {
    console.log("✅ No relevant code changes detected for defined test scopes. Skipping tests.");
  } else {
    console.log(`🎯 Running targeted tests: ${tests.map((t) => t.name).join(", ")}`);
    for (const test of tests) {
      console.log(`\n▶️ Executing: ${test.name}`);
      try {
        execSync(test.command, { stdio: "inherit" });
      } catch (e) {
        console.error(`❌ ${test.name} failed!`);
        process.exit(1);
      }
    }
    console.log("\n✅ All targeted tests passed.");
  }
}

runTests();
