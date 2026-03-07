import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyCheckResult,
  iconForStatus,
  parseCliArgs,
  summarizeReport,
  truncateOutput,
} from "../lib/hardening-audit.mjs";

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

test("parseCliArgs supports overrides", () => {
  const options = parseCliArgs([
    "--out",
    "custom/report.json",
    "--fail-on-warning",
    "--include-output",
    "--timeout-ms",
    "123",
    "--max-output-chars",
    "456",
  ]);

  assert.deepEqual(options, {
    outFile: "custom/report.json",
    failOnWarning: true,
    includeOutput: true,
    timeoutMs: 123,
    maxOutputChars: 456,
  });
});

test("truncateOutput keeps short output and truncates long output", () => {
  assert.equal(truncateOutput("abc", 10), "abc");
  assert.match(truncateOutput("abcdefghij", 5), /truncated 5 chars/);
});

test("iconForStatus returns stable text labels", () => {
  assert.equal(iconForStatus("passed"), "PASS");
  assert.equal(iconForStatus("warning"), "WARN");
  assert.equal(iconForStatus("failed"), "FAIL");
});
