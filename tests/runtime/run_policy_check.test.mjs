import test from "node:test";
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const SCRIPT_PATH = path.resolve("runtime/run_policy_check.mjs");

function runCheck(args) {
  return spawnSync("node", [SCRIPT_PATH, ...args], { encoding: "utf8" });
}

test("run_policy_check.mjs tests", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "summit-test-"));
  const modelFile = path.join(tmpDir, "model.bin");
  fs.writeFileSync(modelFile, "weights data");
  const modelSha = "54413165f3355f832bf74955742352787f1825412653869e5847d2f3587c5e37"; // sha256 of "weights data"

  const validEgress = path.join(tmpDir, "egress.json");
  fs.writeFileSync(validEgress, JSON.stringify({ deny_all: true }));

  const invalidEgress = path.join(tmpDir, "invalid_egress.json");
  fs.writeFileSync(invalidEgress, JSON.stringify({ deny_all: false }));

  const receiptDir = path.join(tmpDir, "receipts");
  fs.mkdirSync(receiptDir);

  await t.test("Success Case", () => {
    const result = runCheck([
      "--model", modelFile,
      "--sha256", modelSha,
      "--egress", validEgress,
      "--receipt", receiptDir
    ]);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /POLICY_PASS/);
  });

  await t.test("Failure: Digest Mismatch", () => {
    const result = runCheck([
      "--model", modelFile,
      "--sha256", "wrong-sha",
      "--egress", validEgress,
      "--receipt", receiptDir
    ]);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /POLICY_FAIL: Digest mismatch/);
  });

  await t.test("Failure: Missing SHA256", () => {
    const result = runCheck([
      "--model", modelFile,
      "--egress", validEgress,
      "--receipt", receiptDir
    ]);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /POLICY_FAIL: Expected SHA256 digest is missing/);
  });

  await t.test("Failure: Egress not deny-all", () => {
    const result = runCheck([
      "--model", modelFile,
      "--sha256", modelSha,
      "--egress", invalidEgress,
      "--receipt", receiptDir
    ]);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /POLICY_FAIL: Egress policy must be deny-by-default/);
  });

  await t.test("Failure: Dangerous Mount (/etc)", () => {
    const result = runCheck([
      "--model", modelFile,
      "--sha256", modelSha,
      "--egress", validEgress,
      "--receipt", receiptDir,
      "--mount", "/etc:/app/etc:ro"
    ]);
    assert.strictEqual(result.status, 2);
    assert.match(result.stderr, /POLICY_FAIL: Dangerous mount detected/);
  });

  await t.test("Large File Simulation (Stream Hashing)", () => {
    // We won't actually create a >2GB file in the sandbox,
    // but the success case already uses the stream-based logic.
    const largeFile = path.join(tmpDir, "large.bin");
    const buf = Buffer.alloc(1024 * 1024, "X"); // 1MB
    fs.writeFileSync(largeFile, buf);
    const hash = "15d414601da8558309434ed89fe9bf86cef3d99f864a26b225c04b49f3653a7a";

    const result = runCheck([
      "--model", largeFile,
      "--sha256", hash,
      "--egress", validEgress,
      "--receipt", receiptDir
    ]);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /POLICY_PASS/);
  });

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
