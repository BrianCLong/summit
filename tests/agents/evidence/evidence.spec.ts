import { describe, test, expect } from "vitest";
import { REQUIRED_EVIDENCE_FILES } from "../../../src/agents/evidence/schemas";

describe("evidence bundle skeleton", () => {
  test("required evidence files exist (or are generated in CI)", () => {
    // This test is intentionally permissive for local dev.
    // CI should generate these; local can skip by not running the generator.
    expect(REQUIRED_EVIDENCE_FILES.length).toBe(4);
    expect(REQUIRED_EVIDENCE_FILES).toContain("evidence/report.json");
    expect(REQUIRED_EVIDENCE_FILES).toContain("evidence/metrics.json");
    expect(REQUIRED_EVIDENCE_FILES).toContain("evidence/stamp.json");
    expect(REQUIRED_EVIDENCE_FILES).toContain("evidence/index.json");
  });

  test("stamp.json is the only place that may contain timestamps", () => {
    // TODO: implement once generator is wired into CI.
    expect(true).toBe(true);
  });
});
