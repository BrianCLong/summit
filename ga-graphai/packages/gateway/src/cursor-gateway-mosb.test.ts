import { describe, expect, it } from "vitest";

import type { CursorGatewayRequest } from "common-types";
import { ProvenanceLedger } from "prov-ledger";

import {
  BudgetManager,
  CursorGateway,
  ModelOutputSafetyBudgeter,
  RateLimiter,
} from "./index.ts";

function buildRequest(
  tokens: number,
  requestId: string,
  now: Date
): CursorGatewayRequest {
  const event = {
    tenantId: "tenant-1",
    repo: "repo",
    branch: "main",
    event: "cursor.prompt" as const,
    actor: { id: "user" },
    ts: new Date().toISOString(),
    purpose: "investigation" as const,
    provenance: {
      sessionId: "session-1",
      requestId,
    },
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: tokens,
    },
    tags: ["cws:category:pii"],
  };

  return {
    event,
    auth: {
      tenantId: "tenant-1",
      actor: { id: "user" },
      scopes: ["call_llm"],
      tokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    now,
  };
}

describe("CursorGateway MOSB integration", () => {
  it("records MOSB state and blocks when budgets are exhausted", async () => {
    let current = Date.UTC(2024, 0, 1, 0, 0, 0);
    const mosb = new ModelOutputSafetyBudgeter({
      config: {
        categories: {
          pii: { tokens: 100, windowMs: 60_000 },
        },
      },
      secret: "secret",
      now: () => new Date(current),
    });

    const gateway = new CursorGateway({
      policyEvaluator: {
        evaluate: () => ({
          decision: "allow",
          explanations: [],
          timestamp: new Date().toISOString(),
        }),
      } as unknown as import("policy").PolicyEvaluator,
      ledger: new ProvenanceLedger(),
      budgetManager: new BudgetManager({ budgets: {} }),
      rateLimiter: new RateLimiter({ capacity: 10, refillPerSecond: 10 }),
      mosb,
    });

    const first = await gateway.handle(
      buildRequest(80, "req-1", new Date(current))
    );
    expect(first.decision.decision).toBe("allow");
    expect(first.mosb?.ledger.totals.categoryTokens.pii).toBe(80);

    current += 1_000;
    const second = await gateway.handle(
      buildRequest(40, "req-2", new Date(current))
    );
    expect(second.decision.decision).toBe("deny");
    expect(second.mosb?.reason).toBe("deny:mosb-category:pii");
    expect(second.record.mosb?.ledger.previousSignature).toBe(
      first.record.mosb?.ledger.signature
    );
  });
});
