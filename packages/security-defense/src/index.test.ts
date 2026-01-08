import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { runAllChecks, summarizeResults } from "./runner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const compliantRoot = path.join(here, "..", "test-fixtures", "compliant");
const noncompliantRoot = path.join(here, "..", "test-fixtures", "noncompliant");

const filterFailures = (results: ReturnType<typeof runAllChecks>) =>
  results.filter((result) => result.status === "fail");

describe("security defense checks", () => {
  it("passes for compliant fixtures", () => {
    const results = runAllChecks({ rootDir: compliantRoot, now: new Date("2025-08-25") });
    const summary = summarizeResults(results);

    expect(filterFailures(results)).toHaveLength(0);
    expect(summary.score).toBe(100);
  });

  it("surfaces failures for noncompliant fixtures", () => {
    const results = runAllChecks({ rootDir: noncompliantRoot, now: new Date("2025-08-25") });
    const failures = filterFailures(results);

    const failingRequirements = failures.map((failure) => failure.requirement);
    expect(failingRequirements).toContain("Workflow permissions");
    expect(failingRequirements).toContain("Pinned actions");
    expect(failingRequirements).toContain("Secret scanning");
    expect(failingRequirements).toContain("Rotation cadence");
    expect(failingRequirements).toContain("Run as non-root");
    expect(failingRequirements).toContain("No wildcard admin");
  });
});
