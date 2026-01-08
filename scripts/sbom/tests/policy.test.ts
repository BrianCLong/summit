import * as fs from "fs";
import * as path from "path";
import { checkPolicy } from "../policy";
import assert from "assert";

const FIXTURE_DIR = path.resolve(__dirname, "fixtures");
const SBOM_BAD = path.join(FIXTURE_DIR, "sbom-bad.json");
const SBOM_GOOD = path.join(FIXTURE_DIR, "sbom-good.json");

// Ensure fixture dir exists
if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

// Write a bad SBOM
const badSbom = {
  components: [
    {
      name: "malicious-lib",
      version: "6.6.6",
      licenses: [{ license: { id: "GPL-3.0" } }],
      purl: "pkg:npm/malicious-lib@6.6.6",
    },
    {
      name: "incomplete-lib",
      // missing version
    },
  ],
};
fs.writeFileSync(SBOM_BAD, JSON.stringify(badSbom, null, 2));

// Write a good SBOM
const goodSbom = {
  components: [
    {
      name: "safe-lib",
      version: "1.0.0",
      licenses: [{ license: { id: "MIT" } }],
      purl: "pkg:npm/safe-lib@1.0.0",
    },
  ],
};
fs.writeFileSync(SBOM_GOOD, JSON.stringify(goodSbom, null, 2));

async function runTests() {
  console.log("Running SBOM Policy Tests...");

  // Test Bad SBOM
  console.log("Test: Should fail on bad SBOM");
  process.env.SBOM_FILE_PATH = SBOM_BAD;
  const failResult = checkPolicy(false);
  assert.strictEqual(failResult, false, "Expected bad SBOM to fail policy check");
  console.log("PASS");

  // Test Good SBOM
  console.log("Test: Should pass on good SBOM");
  process.env.SBOM_FILE_PATH = SBOM_GOOD;
  const passResult = checkPolicy(false);
  assert.strictEqual(passResult, true, "Expected good SBOM to pass policy check");
  console.log("PASS");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
