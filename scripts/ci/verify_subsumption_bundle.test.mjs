import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import assert from "node:assert";

const verifier = path.resolve("scripts/ci/verify_subsumption_bundle.mjs");
const fixturesRoot = path.resolve("scripts/ci/__fixtures__/subsumption");

function runVerifier(fixtureName, item) {
  const fixturePath = path.join(fixturesRoot, fixtureName);
  const result = spawnSync("node", [verifier, "--item", item], {
    env: { ...process.env, TEST_ROOT: fixturePath },
    encoding: "utf8"
  });
  return result;
}

console.log("Running Subsumption Verifier Tests...");

// Test 1: Valid Bundle
{
  console.log("Test 1: Valid Bundle (item-test)");
  const result = runVerifier("valid", "item-test");
  if (result.status !== 0) {
      console.error("STDOUT:", result.stdout);
      console.error("STDERR:", result.stderr);
      throw new Error(`Expected success (0), got ${result.status}`);
  }
  console.log("PASS");
}

// Test 2: Invalid Bundle (Missing Index)
{
  console.log("Test 2: Invalid Bundle (Missing Index)");
  const result = runVerifier("invalid-missing-index", "item-test");
  if (result.status === 0) {
      console.error("STDOUT:", result.stdout);
      console.error("STDERR:", result.stderr);
      throw new Error(`Expected failure (!= 0), got ${result.status}`);
  }
  if (!result.stderr.includes("Missing required target: evidence/index.json")) {
      throw new Error(`Expected error message about missing index, got: ${result.stderr}`);
  }
  console.log("PASS");
}

console.log("All tests passed.");
