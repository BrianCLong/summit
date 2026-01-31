import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const verifier = "scripts/ci/verify_subsumption_bundle.mjs";
const manifest = "subsumption/item-unknown/manifest.yaml";

function run(args) {
  return spawnSync("node", [verifier, ...args], { encoding: "utf8" });
}

console.log("Running Verifier Tests...");

// Test 1: Success case
{
  const result = run([manifest]);
  if (result.status !== 0) {
    console.error("FAILED: Expected success, got:", result.status);
    console.error(result.stderr);
    process.exit(1);
  }
  console.log("PASS: Success case");
}

// Test 2: Missing manifest
{
  const result = run(["non-existent.yaml"]);
  if (result.status === 0) {
    console.error("FAILED: Expected failure for missing manifest");
    process.exit(1);
  }
  console.log("PASS: Missing manifest case");
}

// Test 3: Missing fixture (negative test)
{
  const denyPath = "subsumption/item-unknown/fixtures/deny/README.md";
  const tempPath = denyPath + ".bak";

  if (!fs.existsSync(denyPath)) {
    console.error("FAILED: Deny fixture missing before test start");
    process.exit(1);
  }

  fs.renameSync(denyPath, tempPath);

  try {
    const result = run([manifest]);

    if (result.status === 0) {
      console.error("FAILED: Expected failure for missing deny fixture");
      process.exit(1);
    }
    if (!result.stderr.includes("Missing deny-by-default fixture")) {
      console.error("FAILED: Wrong error message for missing fixture:", result.stderr);
      process.exit(1);
    }
    console.log("PASS: Missing fixture case");
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, denyPath); // Restore
    }
  }
}

console.log("All tests passed!");
