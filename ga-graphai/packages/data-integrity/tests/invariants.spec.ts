import { describe, expect, it } from "vitest";
import {
  InvariantEngine,
  cycleRule,
  requiredRelationshipRule,
  uniquenessRule,
} from "../src/index.js";

describe("invariants", () => {
  it("detects duplicate IDs during audit", () => {
    const engine = new InvariantEngine([uniquenessRule<{ id: string }>("entities")]);
    const violations = engine.runAudit([{ id: "a" }, { id: "a" }, { id: "b" }]);
    expect(violations).toHaveLength(1);
    expect(violations[0].affectedIds).toContain("a");
  });

  it("blocks boundary write when required relation missing", () => {
    const rule = requiredRelationshipRule("case", new Set(["case-1"]));
    const engine = new InvariantEngine([rule]);
    const violations = engine.runBoundaryChecks({ id: "missing" });
    expect(violations[0].severity).toBe("block");
  });

  it("finds simple cycles in bounded graph", () => {
    const engine = new InvariantEngine([
      cycleRule(
        [
          { from: "a", to: "b" },
          { from: "b", to: "c" },
          { from: "c", to: "a" },
        ],
        "warn"
      ),
    ]);
    const violations = engine.runAudit([]);
    expect(violations[0].ruleId).toBe("graph-cycle-check");
  });
});
