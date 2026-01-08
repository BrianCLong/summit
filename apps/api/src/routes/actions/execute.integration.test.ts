import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { EventPublisher } from "../../services/EventPublisher.js";
import { InMemoryPolicyDecisionStore } from "../../services/PolicyDecisionStore.js";

const buildFixtures = () => {
  const store = new InMemoryPolicyDecisionStore();
  const events = new EventPublisher();
  const { app } = buildApp({ store, events });
  return { app, store, events };
};

describe("/actions/execute", () => {
  it("executes when preflight hash matches and returns correlation", async () => {
    const { app, store, events } = buildFixtures();
    const preflightId = "pf_123";
    store.upsertPreflight({
      id: preflightId,
      action: "test-action",
      input: { target: "alpha", level: 2 },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      context: { tenant: "acme" },
    });

    const response = await request(app)
      .post("/actions/execute")
      .set("x-correlation-id", "corr-abc")
      .send({
        preflight_id: preflightId,
        action: "test-action",
        input: { level: 2, target: "alpha" },
      });

    expect(response.status).toBe(200);
    expect(response.body.correlation_id).toBe("corr-abc");
    expect(response.body.execution_id).toMatch(/^exec_/);
    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      correlationId: "corr-abc",
      preflightId,
      action: "test-action",
    });
  });

  it("rejects when the computed hash differs from the stored preflight", async () => {
    const { app, store, events } = buildFixtures();
    const preflightId = "pf_mismatch";
    store.upsertPreflight({
      id: preflightId,
      action: "test-action",
      input: { original: true },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const response = await request(app)
      .post("/actions/execute")
      .send({
        preflight_id: preflightId,
        action: "test-action",
        input: { original: false },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("preflight_hash_mismatch");
    expect(events.events).toHaveLength(0);
  });

  it("fails when preflight is missing or expired", async () => {
    const { app, store } = buildFixtures();
    const expiredId = "pf_expired";

    store.upsertPreflight({
      id: expiredId,
      action: "test-action",
      input: { ok: true },
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    });

    const missingResponse = await request(app)
      .post("/actions/execute")
      .send({
        preflight_id: "pf_unknown",
        input: { ok: true },
      });
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body.error).toBe("preflight_not_found");

    const expiredResponse = await request(app)
      .post("/actions/execute")
      .send({
        preflight_id: expiredId,
        input: { ok: true },
      });
    expect(expiredResponse.status).toBe(410);
    expect(expiredResponse.body.error).toBe("preflight_expired");
  });
});
