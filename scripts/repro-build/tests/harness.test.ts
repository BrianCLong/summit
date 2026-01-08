import * as fs from "fs";
import * as path from "path";
import { runHarness } from "../harness";
import assert from "assert";

const TEST_DIR = path.resolve(__dirname, "test-workspace");
const MOCK_BUILD_SCRIPT = path.join(TEST_DIR, "mock-build.js");
const OUTPUT_DIR = "dist";

function setup() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

function createMockBuildScript(isDeterministic: boolean) {
  const scriptContent = `
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '${OUTPUT_DIR}');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// File 1: Always same
fs.writeFileSync(path.join(outputDir, 'static.txt'), 'Hello World');

// File 2: Deterministic or Random
const content = ${isDeterministic} ? 'Fixed' : Math.random().toString();
fs.writeFileSync(path.join(outputDir, 'dynamic.txt'), content);
`;
  fs.writeFileSync(MOCK_BUILD_SCRIPT, scriptContent);
}

async function runTests() {
  console.log("Running Reproducible Build Harness Tests...");
  setup();

  // Test 1: Deterministic Build
  console.log("Test 1: Deterministic Build");
  createMockBuildScript(true);
  const result1 = runHarness({
    buildCommand: `node ${MOCK_BUILD_SCRIPT}`,
    outputDir: OUTPUT_DIR,
    cwd: TEST_DIR,
  });

  assert.strictEqual(result1.success, true, "Expected deterministic build to pass");
  assert.strictEqual(result1.report.length, 0);
  console.log("PASS");

  // Test 2: Non-Deterministic Build
  console.log("Test 2: Non-Deterministic Build");
  createMockBuildScript(false);
  const result2 = runHarness({
    buildCommand: `node ${MOCK_BUILD_SCRIPT}`,
    outputDir: OUTPUT_DIR,
    cwd: TEST_DIR,
  });

  assert.strictEqual(result2.success, false, "Expected non-deterministic build to fail");
  assert.ok(
    result2.report.some((r) => r.includes("Content mismatch: dynamic.txt")),
    "Expected report to mention dynamic.txt"
  );
  console.log("PASS");

  // Cleanup
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
