import express from "express";
import request from "supertest";

import { type PreflightRequestContract } from "../src/contracts/actions.js";
import {
  PolicyDecisionStore,
  type PolicyDecisionRecord,
} from "../src/db/models/policy_decisions.js";
import { createPreflightRouter } from "../src/routes/actions/preflight.js";
import {
  type PolicyDecisionResult,
  type PolicySimulationService,
} from "../src/services/policyService.js";

class FakePolicyService implements PolicySimulationService {
  public lastInput?: PreflightRequestContract;
  constructor(private readonly response: PolicyDecisionResult) {}

  async simulate(input: PreflightRequestContract): Promise<PolicyDecisionResult> {
    this.lastInput = input;
    return this.response;
  }
}

describe("POST /actions/preflight", () => {
  const baseInput: PreflightRequestContract = {
    subject: { id: "user-1", roles: ["analyst"], tenantId: "acme" },
    action: { name: "export", scope: "case", attributes: {} },
    resource: { id: "case-123", type: "case", classification: "restricted" },
    context: { requestId: "req-1", ip: "127.0.0.1" },
  };

  function buildApp(policyService: PolicySimulationService, store: PolicyDecisionStore) {
    const app = express();
    app.use(express.json());
    app.use("/actions", createPreflightRouter({ policyService, decisionStore: store }));
    return app;
  }

  it("returns normalized decision payload and persists the record", async () => {
    const decision: PolicyDecisionResult = {
      allow: true,
      reason: "permit",
      obligations: [
        { code: "audit", message: "log export" },
        { code: "redact", message: "remove pii", targets: ["ssn"] },
      ],
      redactions: ["account_number"],
      raw: { result: { allow: true } },
    };

    const store = new PolicyDecisionStore(() => new Date("2024-01-01T00:00:00Z"));
    const policyService = new FakePolicyService(decision);
    const app = buildApp(policyService, store);

    const response = await request(app).post("/actions/preflight").send(baseInput).expect(200);

    expect(response.body).toMatchObject({
      decisionId: expect.any(String),
      decision: "allow",
      reason: "permit",
      obligations: decision.obligations,
      redactions: ["account_number", "ssn"],
    });

    expect(policyService.lastInput).toEqual(baseInput);

    const records = await store.all();
    expect(records).toHaveLength(1);
    const stored: PolicyDecisionRecord = records[0]!;
    expect(stored.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(stored.allow).toBe(true);
    expect(stored.request).toEqual(baseInput);
    expect(stored.redactions).toEqual(["account_number", "ssn"]);
  });

  it("handles missing required fields with a validation error", async () => {
    const policyService = new FakePolicyService({
      allow: false,
      obligations: [],
      redactions: [],
      raw: {},
    });

    const store = new PolicyDecisionStore();
    const app = buildApp(policyService, store);

    await request(app)
      .post("/actions/preflight")
      .send({ action: { name: "export" } })
      .expect(400);

    const records = await store.all();
    expect(records).toHaveLength(0);
  });

  it("propagates simulation failures as gateway errors", async () => {
    const failingService: PolicySimulationService = {
      async simulate() {
        throw new Error("opa unavailable");
      },
    };

    const store = new PolicyDecisionStore();
    const app = buildApp(failingService, store);

    const res = await request(app).post("/actions/preflight").send(baseInput).expect(502);

    expect(res.body).toMatchObject({
      error: "policy_simulation_failed",
      message: "opa unavailable",
    });
    expect(await store.all()).toHaveLength(0);
  });
});
