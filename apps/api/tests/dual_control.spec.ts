// @ts-nocheck
jest.mock("../../../services/authz-gateway/src/observability", () => ({
  startObservability: jest.fn(),
  metricsHandler: (_req: any, res: any, next?: any) =>
    typeof next === "function" ? next() : res?.status?.(200)?.end(),
  requestMetricsMiddleware: (_req: any, _res: any, next: any) => next(),
  tracingContextMiddleware: (_req: any, _res: any, next: any) => next(),
  injectTraceContext: jest.fn(),
  stopObservability: jest.fn(),
}));
import express from "express";
import request from "supertest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { authorize } from "../../../services/authz-gateway/src/policy";
import { AttributeService } from "../../../services/authz-gateway/src/attribute-service";
import { approvalsStore } from "../../../services/authz-gateway/src/db/models/approvals";
import { createApp } from "../../../services/authz-gateway/src/index";
import { requireAuth } from "../../../services/authz-gateway/src/middleware";
import { stopObservability } from "../../../services/authz-gateway/src/observability";
import { issueServiceToken } from "../../../services/authz-gateway/src/service-auth";
import abacData from "../../../policy/abac/data.json";

const attributeService = new AttributeService({ ttlMs: 0 });

function clearanceRank(level: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (abacData as any).clearance_rank[level] ?? -1;
}

function simulateDecision(input: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionConfig = (abacData as any).actions[input.action] || {};
  const tenantMatch = input.subject.tenantId === input.resource.tenantId;
  const residencyMatrix =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((abacData as any).residency_matrix[input.subject.residency] as string[]) || [];
  const residencyAllowed = residencyMatrix.includes(input.resource.residency);
  const clearanceOk =
    clearanceRank(input.subject.clearance) >= clearanceRank(input.resource.classification);
  const hasRole =
    !actionConfig.allowedRoles ||
    actionConfig.allowedRoles.length === 0 ||
    actionConfig.allowedRoles.some((role: string) => input.subject.roles.includes(role));
  const allow = tenantMatch && residencyAllowed && clearanceOk && hasRole;

  const obligations: any[] = [];
  if (actionConfig.requiresStepUp && input.context.currentAcr !== "loa2") {
    obligations.push({
      type: "step_up",
      mechanism: "webauthn",
      required_acr: "loa2",
    });
  }

  if (actionConfig.dualControl?.required) {
    obligations.push({
      type: "dual_control",
      approvals_required: actionConfig.dualControl.approvalsRequired,
      approver_roles: actionConfig.dualControl.approverRoles,
      require_distinct: actionConfig.dualControl.requireDistinctApprovers,
      attributes: {
        match_residency: actionConfig.dualControl.attributes?.matchResidency,
        min_clearance: actionConfig.dualControl.attributes?.minClearance,
        resource_residency: input.resource.residency,
        resource_classification: input.resource.classification,
      },
    });
  }

  return {
    allow,
    reason: allow ? "allow" : "policy_denied",
    obligations,
  };
}

let opaServer: Server;

beforeAll((done) => {
  const opa = express();
  opa.use(express.json());
  opa.post("/v1/data/summit/abac/decision", (req, res) =>
    res.json({ result: simulateDecision(req.body.input) })
  );
  opaServer = opa.listen(0, () => {
    const port = (opaServer.address() as AddressInfo).port;
    process.env.OPA_URL = `http://localhost:${port}/v1/data/summit/abac/decision`;
    done();
  });
});

afterAll(async () => {
  opaServer?.close();
  await stopObservability();
});

beforeEach(() => {
  approvalsStore.reset();
});

describe("dual control policy + execution", () => {
  it("surfaces dual-control obligations for sensitive actions", async () => {
    const subject = await attributeService.getSubjectAttributes("carol");
    const resource = await attributeService.getResourceAttributes("dataset-gamma");

    const decision = await authorize({
      subject,
      resource,
      action: "dataset:delete",
      context: attributeService.getDecisionContext("loa1"),
    });

    expect(decision.allowed).toBe(true);
    const obligation = decision.obligations.find((o) => o.type === "dual_control");
    expect(obligation).toBeDefined();
    expect(obligation?.approvals_required).toBe(2);
    expect(obligation?.approver_roles).toEqual(expect.arrayContaining(["admin"]));
  });

  it("blocks execution until dual-control approvals are satisfied", async () => {
    const app = await createApp();
    const localAttributeService = new AttributeService({ ttlMs: 0 });

    app.get(
      "/sensitive/delete",
      requireAuth(localAttributeService, {
        action: "dataset:delete",
        resourceIdHeader: "x-resource-id",
      }),
      (_req, res) => res.json({ ok: true })
    );

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ username: "carol", password: "password123" });
    const token = loginRes.body.token;

    const firstAttempt = await request(app)
      .get("/sensitive/delete")
      .set("Authorization", `Bearer ${token}`)
      .set("x-resource-id", "dataset-gamma");

    expect(firstAttempt.status).toBe(403);
    expect(firstAttempt.body.error).toBe("dual_control_required");
    expect(firstAttempt.body.missing).toBeGreaterThan(0);

    const serviceToken = await issueServiceToken({
      audience: "authz-gateway",
      serviceId: "api-gateway",
      scopes: ["approvals:write"],
      expiresInSeconds: 300,
    });

    for (const approverId of ["dave", "erin"]) {
      await request(app)
        .post("/approvals")
        .set("x-service-token", serviceToken)
        .send({
          action: "dataset:delete",
          resourceId: "dataset-gamma",
          requesterId: "carol",
          approverId,
          decision: "approved",
        })
        .expect(200);
    }

    const allowed = await request(app)
      .get("/sensitive/delete")
      .set("Authorization", `Bearer ${token}`)
      .set("x-resource-id", "dataset-gamma");

    expect(allowed.status).toBe(200);
    expect(allowed.body.ok).toBe(true);
  });
});
