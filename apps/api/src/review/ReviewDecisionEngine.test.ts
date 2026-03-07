import { describe, expect, it } from "vitest";
import { ReviewDecisionEngine } from "./ReviewDecisionEngine.js";
import { ReviewItem } from "./models.js";

const pendingItem: ReviewItem = {
  id: "item-1",
  type: "entity",
  status: "pending",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("ReviewDecisionEngine", () => {
  it("applies a decision when no prior decision exists", () => {
    const engine = new ReviewDecisionEngine();
    const result = engine.applyDecision(pendingItem, {
      action: "approve",
      reasonCode: "rule_match",
      correlationId: "corr-1",
      decidedAt: "2024-02-01T00:00:00.000Z",
    });

    expect(result.item.status).toBe("decided");
    expect(result.item.lastDecision?.action).toBe("approve");
    expect(result.idempotent).toBe(false);
  });

  it("is idempotent for the same correlation id", () => {
    const engine = new ReviewDecisionEngine();
    const initial = engine.applyDecision(pendingItem, {
      action: "reject",
      reasonCode: "validation_failed",
      correlationId: "corr-2",
      decidedAt: "2024-02-02T00:00:00.000Z",
    });

    const repeat = engine.applyDecision(initial.item, {
      action: "reject",
      reasonCode: "validation_failed",
      correlationId: "corr-2",
      decidedAt: "2024-02-02T00:00:00.000Z",
    });

    expect(repeat.idempotent).toBe(true);
    expect(repeat.item).toEqual(initial.item);
  });

  it("rejects conflicting decisions", () => {
    const engine = new ReviewDecisionEngine();
    const decided = engine.applyDecision(pendingItem, {
      action: "approve",
      reasonCode: "rule_match",
      correlationId: "corr-3",
      decidedAt: "2024-02-03T00:00:00.000Z",
    });

    expect(() =>
      engine.applyDecision(decided.item, {
        action: "reject",
        reasonCode: "manual_override",
        correlationId: "different-corr",
        decidedAt: "2024-02-04T00:00:00.000Z",
      })
    ).toThrow("decision_already_recorded");
  });
});
