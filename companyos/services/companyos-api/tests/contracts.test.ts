import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../src/index";
import * as opaClient from "../src/authz/opa-client";

vi.mock("../src/authz/opa-client", () => ({
  evaluateCustomerRead: vi.fn(() => Promise.resolve({ allow: true })),
}));

describe("Service Contract Discipline", () => {
  it("should allow valid requests", async () => {
    const res = await request(app)
      .get("/tenants/tenant_1/customers/cust_1")
      .set("x-tenant-id", "tenant_1");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("cust_1");
  });

  it("should block requests that violate the contract", async () => {
    const res = await request(app)
      .get("/tenants/invalid/customers/cust_1")
      .set("x-tenant-id", "tenant_1");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("contract_violation");
  });
});
