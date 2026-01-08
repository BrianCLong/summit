import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import crypto from "node:crypto";

const TEST_ROOT = "tmp-test/drift-check-test";
const EVIDENCE_ROOT = path.join(TEST_ROOT, "evidence/security");
const MOCK_ARTIFACT_PATH = path.join(TEST_ROOT, "MOCK_ARTIFACT.md");

// Helper to run drift check with modified CWD or by mocking fs (harder with execSync)
// Instead, we will generate a real evidence pack (offline) pointing to a temp dir,
// then modify a file, then run drift check pointing to that same temp dir.
// But drift check looks at 'evidence/security' in CWD.
// So we need to run these tests in a sandbox CWD or monkey-patch the path in the script.
// For simplicity, I made the script check 'evidence/security'. I can create a symlink or
// temporary structure.

// Actually, I can just use the drift script's logic by importing it?
// No, it's a script.
// I will create the directory structure `evidence/security` inside `tmp-test/drift-check-test`
// and run the script from `tmp-test/drift-check-test`.

test("Drift Check", (t) => {
  // Setup
  if (fs.existsSync(TEST_ROOT)) fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TEST_ROOT, { recursive: true });

  // Create a mock artifact
  fs.writeFileSync(MOCK_ARTIFACT_PATH, "original content");

  // Create an evidence pack manually to simulate "previous state"
  const timestamp = "20250101-000000";
  const packDir = path.join(EVIDENCE_ROOT, timestamp);
  fs.mkdirSync(path.join(packDir, "artifacts"), { recursive: true });

  // Create the artifact in the pack (not strictly needed for drift check if we only check path exists,
  // but the script checks if file exists at `artifact.path` relative to root)
  // The `artifact.path` in index.json should be relative to repo root.
  // When running from TEST_ROOT, "MOCK_ARTIFACT.md" is the relative path.

  // Calculate SHA of original
  const hash = crypto.createHash("sha256").update("original content").digest("hex");

  const index = {
    meta: {},
    artifacts: [{ path: "MOCK_ARTIFACT.md", sha256: hash }],
  };

  fs.writeFileSync(path.join(packDir, "index.json"), JSON.stringify(index));

  // Script path
  const scriptPath = path.resolve("scripts/security/drift-check.ts");

  // 1. Run Drift Check - Should Pass
  try {
    execSync(`npx tsx ${scriptPath}`, { cwd: TEST_ROOT, stdio: "pipe" });
    assert.ok(true, "Drift check passed with matching content");
  } catch (e) {
    assert.fail("Drift check failed unexpectedly");
  }

  // 2. Modify Artifact
  fs.writeFileSync(MOCK_ARTIFACT_PATH, "modified content");

  // 3. Run Drift Check - Should Fail
  try {
    execSync(`npx tsx ${scriptPath}`, { cwd: TEST_ROOT, stdio: "pipe" });
    assert.fail("Drift check should have failed");
  } catch (e: any) {
    assert.strictEqual(e.status, 1, "Exit code should be 1");
    // We can't easily check stdout with execSync throwing, strictly speaking.
    // But the exit code confirms failure.
  }

  // Cleanup
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});
