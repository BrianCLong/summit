import { describe, expect, it } from "vitest";

import type { CursorEvent } from "common-types";
import { ModelOutputSafetyBudgeter } from "./mosb.ts";

interface EventOptions {
  sessionId: string;
  requestId: string;
  tokens: number;
  tags?: string[];
  dataClasses?: string[];
}

function buildEvent({
  sessionId,
  requestId,
  tokens,
  tags = [],
  dataClasses,
}: EventOptions): CursorEvent {
  return {
    tenantId: "tenant-1",
    repo: "repo",
    branch: "main",
    event: "cursor.prompt",
    actor: { id: "user" },
    ts: new Date().toISOString(),
    purpose: "investigation",
    provenance: {
      sessionId,
      requestId,
    },
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: tokens,
    },
    tags,
    dataClasses,
  };
}

describe("ModelOutputSafetyBudgeter", () => {
  it("decrements category budgets deterministically and blocks when exceeded", () => {
    let current = Date.UTC(2024, 0, 1);
    const budgeter = new ModelOutputSafetyBudgeter({
      config: {
        categories: {
          pii: { tokens: 100, windowMs: 60_000 },
        },
      },
      secret: "secret",
      now: () => new Date(current),
    });

    const first = budgeter.evaluate(
      buildEvent({
        sessionId: "sess-1",
        requestId: "req-1",
        tokens: 60,
        tags: ["cws:category:pii"],
      })
    );

    expect(first.allowed).toBe(true);
    expect(first.ledger.deltas.categoryTokens.pii).toBe(60);
    expect(first.ledger.totals.categoryTokens.pii).toBe(60);

    current += 1_000;
    const second = budgeter.evaluate(
      buildEvent({
        sessionId: "sess-1",
        requestId: "req-2",
        tokens: 50,
        tags: ["cws:category:pii"],
      })
    );

    expect(second.allowed).toBe(false);
    expect(second.reason).toBe("deny:mosb-category:pii");
    expect(second.ledger.previousSignature).toBe(first.ledger.signature);
    const categoryTrace = second.traces.find(
      (trace) => trace.type === "category" && trace.category === "pii"
    );
    expect(categoryTrace?.remaining).toBe(0);
  });

  it("escalates after unsafe detections and blocks when max is reached", () => {
    let current = Date.UTC(2024, 0, 1, 0, 0, 0);
    const budgeter = new ModelOutputSafetyBudgeter({
      config: {
        categories: {},
        detection: { maxIncidents: 2, windowMs: 120_000, escalateAfter: 1 },
      },
      secret: "secret",
      now: () => new Date(current),
    });

    const first = budgeter.evaluate(
      buildEvent({
        sessionId: "sess-2",
        requestId: "req-1",
        tokens: 10,
        tags: ["mocc:unsafe"],
      })
    );

    expect(first.allowed).toBe(true);
    expect(first.stepUpRequired).toBe(true);
    const detectionTrace = first.traces.find((trace) => trace.type === "detection");
    expect(detectionTrace?.delta).toBe(1);
    expect(detectionTrace?.escalated).toBe(true);

    current += 1_000;
    const second = budgeter.evaluate(
      buildEvent({
        sessionId: "sess-2",
        requestId: "req-2",
        tokens: 5,
        tags: ["mocc:unsafe"],
      })
    );

    expect(second.allowed).toBe(false);
    expect(second.reason).toBe("deny:mosb-unsafe-detections");
    expect(second.stepUpRequired).toBe(true);
  });

  it("resets exposure windows after expiry", () => {
    let current = Date.UTC(2024, 0, 1, 0, 0, 0);
    const budgeter = new ModelOutputSafetyBudgeter({
      config: {
        categories: {
          pii: { tokens: 50, windowMs: 5_000 },
        },
      },
      secret: "secret",
      now: () => new Date(current),
    });

    budgeter.evaluate(
      buildEvent({
        sessionId: "sess-3",
        requestId: "req-1",
        tokens: 40,
        tags: ["cws:category:pii"],
      })
    );

    current += 6_000;
    const afterWindow = budgeter.evaluate(
      buildEvent({
        sessionId: "sess-3",
        requestId: "req-2",
        tokens: 40,
        tags: ["cws:category:pii"],
      })
    );

    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.ledger.totals.categoryTokens.pii).toBe(40);
  });
});
