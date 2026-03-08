import test from "node:test";
import assert from "node:assert/strict";
import { classifyCheckResult, summarizeReport } from "../lib/hardening-audit.mjs";

test("classifyCheckResult marks successful checks as passed", () => {
  const result = classifyCheckResult({ code: 0, stdout: "ok", stderr: "" });
  assert.equal(result.status, "passed");
});

test("classifyCheckResult marks registry 403 as warning", () => {
  const result = classifyCheckResult({
    code: 1,
    stdout: "",
    stderr: "The audit endpoint responded with 403: Forbidden",
  });
  assert.equal(result.status, "warning");
});

test("classifyCheckResult marks ordinary failures as failed", () => {
  const result = classifyCheckResult({
    code: 1,
    stdout: "",
    stderr: "lint errors found",
  });
  assert.equal(result.status, "failed");
});

test("summarizeReport returns aggregate counts", () => {
  const summary = summarizeReport([
    { status: "passed" },
    { status: "warning" },
    { status: "failed" },
    { status: "passed" },
  ]);

  assert.deepEqual(summary, {
    passed: 2,
    warning: 1,
    failed: 1,
  });
});
