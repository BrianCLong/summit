import express from "express";
import request from "supertest";

import {
  type ActionEventPublisher,
  type ActionExecutionEvent,
  type PolicyDecisionStore,
  type PreflightDecision,
  computeInputHash,
  createExecuteRouter,
} from "../src/routes/actions/execute";

class InMemoryDecisionStore implements PolicyDecisionStore {
  private readonly decisions = new Map<string, PreflightDecision>();
  public readonly executions: Array<{ preflightId: string; receiptId: string }> = [];

  async get(preflightId: string): Promise<PreflightDecision | undefined> {
    return this.decisions.get(preflightId);
  }

  async markExecuted(preflightId: string, receiptId: string): Promise<void> {
    this.executions.push({ preflightId, receiptId });
  }

  add(decision: PreflightDecision): void {
    this.decisions.set(decision.id, decision);
  }
}

class InMemoryEventPublisher implements ActionEventPublisher {
  public readonly events: ActionExecutionEvent[] = [];

  async publish(event: ActionExecutionEvent): Promise<void> {
    this.events.push(event);
  }
}

const buildApp = (store: InMemoryDecisionStore, publisher: InMemoryEventPublisher) => {
  const app = express();
  app.use(express.json());
  app.use(
    createExecuteRouter({
      policyDecisionStore: store,
      eventPublisher: publisher,
      now: () => new Date("2025-01-01T00:00:00Z"),
    })
  );
  return app;
};

describe("POST /actions/execute", () => {
  it("accepts execution when the preflight hash matches and is not expired", async () => {
    const store = new InMemoryDecisionStore();
    const publisher = new InMemoryEventPublisher();
    const inputs = { target: "alpha", resources: ["case-1"] };
    const decision: PreflightDecision = {
      id: "pf-1",
      inputHash: computeInputHash(inputs),
      expiresAt: new Date("2025-01-01T00:10:00Z"),
      status: "allow",
      context: { policy_id: "policy-42" },
    };
    store.add(decision);

    const app = buildApp(store, publisher);
    const response = await request(app)
      .post("/actions/execute")
      .send({ preflight_id: decision.id, inputs });

    expect(response.status).toBe(202);
    expect(response.body.preflight_id).toBe(decision.id);
    expect(response.body.trace_id).toBeTruthy();
    expect(response.body.receipt_id).toBeTruthy();
    expect(store.executions).toContainEqual({
      preflightId: decision.id,
      receiptId: response.body.receipt_id,
    });
    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toMatchObject({
      type: "action.execution.accepted",
      preflightId: decision.id,
      traceId: response.body.trace_id,
      receiptId: response.body.receipt_id,
      inputsHash: decision.inputHash,
      decisionContext: decision.context,
    });
  });

  it("rejects execution when the payload hash does not match the preflight", async () => {
    const store = new InMemoryDecisionStore();
    const publisher = new InMemoryEventPublisher();
    const decision: PreflightDecision = {
      id: "pf-2",
      inputHash: computeInputHash({ original: true }),
      expiresAt: new Date("2025-01-01T00:10:00Z"),
      status: "allow",
    };
    store.add(decision);

    const app = buildApp(store, publisher);
    const response = await request(app)
      .post("/actions/execute")
      .send({
        preflight_id: decision.id,
        inputs: { original: false },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("input_hash_mismatch");
    expect(response.body.trace_id).toBeTruthy();
    expect(response.body.receipt_id).toBeTruthy();
    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toMatchObject({
      type: "action.execution.rejected",
      reason: "input_hash_mismatch",
      preflightId: decision.id,
      traceId: response.body.trace_id,
      receiptId: response.body.receipt_id,
    });
  });

  it("rejects execution when the preflight is expired", async () => {
    const store = new InMemoryDecisionStore();
    const publisher = new InMemoryEventPublisher();
    const inputs = { id: "case-1" };
    const decision: PreflightDecision = {
      id: "pf-3",
      inputHash: computeInputHash(inputs),
      expiresAt: new Date("2024-12-31T23:59:00Z"),
      status: "allow",
    };
    store.add(decision);

    const app = buildApp(store, publisher);
    const response = await request(app)
      .post("/actions/execute")
      .send({ preflight_id: decision.id, inputs });

    expect(response.status).toBe(410);
    expect(response.body.error).toBe("preflight_expired");
    expect(response.body.trace_id).toBeTruthy();
    expect(response.body.receipt_id).toBeTruthy();
    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toMatchObject({
      type: "action.execution.rejected",
      reason: "preflight_expired",
      preflightId: decision.id,
      traceId: response.body.trace_id,
      receiptId: response.body.receipt_id,
    });
  });
});
