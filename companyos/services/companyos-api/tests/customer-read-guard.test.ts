import express from "express";
import request from "supertest";
import nock from "nock";
import { stubIdentity } from "../src/authz/identity-middleware";
import { customerReadGuard } from "../src/authz/customer-read-guard";

describe("customerReadGuard", () => {
  const OPA_PATH = "/v1/data/companyos/authz/customer/decision";

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
    nock.cleanAll();
    process.env.OPA_URL = `http://opa-test.local${OPA_PATH}`;
  });

  it("allows when OPA returns allow=true", async () => {
    nock("http://opa-test.local")
      .post(OPA_PATH)
      .reply(200, { result: { allow: true, reason: "tenant_role_ok" } });

    const app = buildApp();
    const res = await request(app)
      .get("/tenants/tenant_demo/customers/cust_1")
      .set("x-user-id", "user_1")
      .set("x-roles", "compliance_lead");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("cust_1");
  });

  it("denies when OPA returns allow=false", async () => {
    nock("http://opa-test.local")
      .post(OPA_PATH)
      .reply(200, { result: { allow: false, reason: "not_in_tenant" } });

    const app = buildApp();
    const res = await request(app)
      .get("/tenants/other_tenant/customers/cust_1")
      .set("x-user-id", "user_1")
      .set("x-roles", "viewer");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });
});
