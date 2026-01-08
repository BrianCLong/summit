import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const TEST_OUTPUT_DIR = "tmp-test/evidence-pack-test";

test("Evidence Pack - Offline Mode", (t) => {
  // Cleanup
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }

  // Run the script in offline mode
  const scriptPath = path.resolve("scripts/security/evidence-pack.ts");
  const fixturesDir = path.resolve("scripts/security/fixtures");

  // Need to use tsx to run the TS script
  // Using relative path for fixturesDir to match how it might be called
  try {
    execSync(
      `npx tsx ${scriptPath} --mode=offline --fixturesDir=${fixturesDir} --outputDir=${TEST_OUTPUT_DIR}`,
      {
        stdio: "inherit",
      }
    );
  } catch (e) {
    assert.fail("Script execution failed");
  }

  // Find the generated pack (timestamped folder)
  const timestampDirs = fs.readdirSync(TEST_OUTPUT_DIR);
  assert.strictEqual(timestampDirs.length, 1, "Should create exactly one timestamped directory");
  const packDir = path.join(TEST_OUTPUT_DIR, timestampDirs[0]);

  // Assert artifacts
  const artifactsDir = path.join(packDir, "artifacts");
  assert.ok(fs.existsSync(path.join(artifactsDir, "SECURITY.md")), "Should copy SECURITY.md");
  assert.ok(
    fs.existsSync(path.join(artifactsDir, "docs/compliance/EVIDENCE_INDEX.md")),
    "Should copy deep artifact"
  );

  // Assert outputs
  const outputsDir = path.join(packDir, "outputs");
  assert.ok(
    fs.existsSync(path.join(outputsDir, "baseline-report.json")),
    "Should copy baseline-report.json"
  );

  // Assert Index
  const indexJsonPath = path.join(packDir, "index.json");
  assert.ok(fs.existsSync(indexJsonPath));
  const index = JSON.parse(fs.readFileSync(indexJsonPath, "utf-8"));

  assert.strictEqual(index.meta.mode, "offline");
  assert.ok(index.artifacts.some((a: any) => a.path.includes("SECURITY.md")));

  // Assert INDEX.md
  const indexMdPath = path.join(packDir, "INDEX.md");
  assert.ok(fs.existsSync(indexMdPath));
  const mdContent = fs.readFileSync(indexMdPath, "utf-8");
  assert.match(mdContent, /# Security Evidence Pack/);
  assert.match(mdContent, /SECURITY\.md/);

  // Cleanup
  fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
});
