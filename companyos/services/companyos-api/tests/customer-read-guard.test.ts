import express from "express";
import request from "supertest";
import { stubIdentity } from "../src/authz/identity-middleware";
import { customerReadGuard } from "../src/authz/customer-read-guard";
import { evaluateCustomerRead } from "../src/authz/opa-client";
import { vi, describe, beforeEach, it, expect, type Mock } from "vitest";

// Mock the opa-client module
vi.mock("../src/authz/opa-client", () => ({
  evaluateCustomerRead: vi.fn(),
}));

describe("customerReadGuard", () => {
  function buildApp() {
    const app = express();
    app.use(stubIdentity);
    app.get(
      "/tenants/:tenantId/customers/:id",
      customerReadGuard,
      (req, res) => {
        res.json({ id: req.params.id, tenant_id: req.params.tenantId });
      },
    );
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows when OPA returns allow=true", async () => {
    (evaluateCustomerRead as Mock).mockResolvedValue({
      allow: true,
      reason: "tenant_role_ok",
    });

    const app = buildApp();
    const res = await request(app)
      .get("/tenants/tenant_demo/customers/cust_1")
      .set("x-user-id", "user_1")
      .set("x-roles", "compliance_lead");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("cust_1");
  });

  it("denies when OPA returns allow=false", async () => {
    (evaluateCustomerRead as Mock).mockResolvedValue({
      allow: false,
      reason: "not_in_tenant",
    });

    const app = buildApp();
    const res = await request(app)
      .get("/tenants/other_tenant/customers/cust_1")
      .set("x-user-id", "user_1")
      .set("x-roles", "viewer");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });
});
