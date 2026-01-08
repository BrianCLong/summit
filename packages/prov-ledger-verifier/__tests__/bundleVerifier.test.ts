import path from "path";
import { verifyBundle } from "../src/bundleVerifier.js";

const fixturesDir = path.resolve(process.cwd(), "fixtures");

describe("bundle verifier integration", () => {
  it("verifies a valid bundle directory", async () => {
    const report = await verifyBundle(path.join(fixturesDir, "valid-bundle"));

    expect(report.ok).toBe(true);
    expect(report.summary.missingEvidence).toHaveLength(0);
    expect(report.summary.hashMismatches).toHaveLength(0);
    expect(report.checks.transformChains.ok).toBe(true);
  });

  it("verifies a valid bundle zip", async () => {
    const report = await verifyBundle(path.join(fixturesDir, "valid-bundle.zip"));
    expect(report.ok).toBe(true);
  });

  it("fails when evidence is missing", async () => {
    const report = await verifyBundle(path.join(fixturesDir, "missing-evidence"));

    expect(report.ok).toBe(false);
    expect(report.summary.missingEvidence).toContain("evidence-2");
    expect(report.checks.evidenceHashes.ok).toBe(false);
  });

  it("fails when hashes are tampered", async () => {
    const report = await verifyBundle(path.join(fixturesDir, "hash-mismatch"));

    expect(report.ok).toBe(false);
    expect(report.summary.hashMismatches.length).toBeGreaterThan(0);
    expect(report.checks.hashTree.ok).toBe(false);
  });
});
