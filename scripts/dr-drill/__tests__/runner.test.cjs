const test = require("node:test");
const assert = require("node:assert");
const { runDrDrill, evaluateCorruption, assertEnvironment } = require("../runner.cjs");

test("runDrDrill produces passed report on successful flow", () => {
  const executor = (command) => ({
    status: "passed",
    stdout: `${command} ok`,
    stderr: "",
    durationMs: 10,
  });
  const report = runDrDrill({ env: "dev" }, executor);
  assert.equal(report.overallStatus, "passed");
  assert.equal(report.stages.invariants.length, 3);
  assert(report.stages.backup.status === "passed");
});

test("corruption detection marks report as failed", () => {
  const executor = (command, label) => {
    if (label === "corruption check") {
      return { status: "failed", stdout: "checksum mismatch", stderr: "", durationMs: 5 };
    }
    return { status: "passed", stdout: "", stderr: "", durationMs: 5 };
  };

  const report = runDrDrill({ env: "staging" }, executor);
  assert.equal(report.stages.corruptionCheck.status, "corrupted");
  assert.equal(report.overallStatus, "failed");
});

test("evaluateCorruption detects corrupted markers in output", () => {
  const result = evaluateCorruption({
    status: "passed",
    stdout: "corrupt data found",
    stderr: "",
    durationMs: 1,
  });
  assert.equal(result, "corrupted");
});

test("assertEnvironment enforces production guardrails", () => {
  assert.throws(() => assertEnvironment("prod", false, "true"), /cannot run against production/);

  assert.throws(
    () => assertEnvironment("production", true, "false"),
    /cannot run against production/
  );

  assert.equal(assertEnvironment("production", true, "true"), "production");
});
