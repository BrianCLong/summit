import { describe, expect, it } from "vitest";
import { detectConflicts } from "../../src/graph/detectConflicts.js";
import { quarantine } from "../../src/promotion/quarantine.js";
import { makeFixtureWriteSets } from "../../src/testUtils/fixtures.js";

describe("golden: conflict quarantine", () => {
  it("detects conflicting entity claims and quarantines the weaker one", () => {
    const [, b, c] = makeFixtureWriteSets();
    const conflicts = detectConflicts([b, c]);

    expect(conflicts.length).toBeGreaterThan(0);

    const quarantined = quarantine(c, conflicts[0].reason);
    expect(quarantined.promotionState).toBe("quarantined");
    expect(quarantined.content.summary).toContain("QUARANTINED");
  });
});
