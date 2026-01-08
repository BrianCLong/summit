const test = require("node:test");
const assert = require("node:assert");
const { formatMachineReadable, formatHumanSummary } = require("../report.cjs");

const sampleReport = {
  env: "dev",
  overallStatus: "passed",
  startedAt: "2024-01-01T00:00:00Z",
  completedAt: "2024-01-01T00:00:02Z",
  durationMs: 2000,
  stages: {
    backup: { status: "passed" },
    wipe: { status: "passed" },
    restore: { status: "passed" },
    corruptionCheck: { status: "passed" },
    invariants: [
      { name: "tenancyIsolation", status: "passed", details: "isolated" },
      { name: "auditLedgerChain", status: "passed", details: "chain intact" },
    ],
  },
};

test("formatMachineReadable returns valid JSON", () => {
  const json = formatMachineReadable(sampleReport);
  const parsed = JSON.parse(json);
  assert.equal(parsed.env, "dev");
  assert.equal(parsed.stages.invariants.length, 2);
});

test("formatHumanSummary includes key statuses", () => {
  const summary = formatHumanSummary(sampleReport);
  assert(summary.includes("Environment: dev"));
  assert(summary.includes("Backup: passed"));
  assert(summary.includes("Invariants:"));
  assert(summary.includes("tenancyIsolation"));
});
