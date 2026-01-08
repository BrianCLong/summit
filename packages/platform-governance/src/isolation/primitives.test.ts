import { describe, expect, it } from "vitest";
import {
  assertServiceIsolation,
  assertTenantMatch,
  createTenantScopedParams,
  enforceCompartments,
  IsolationViolationError,
  requireTenantScope,
  scopeSqlToTenant,
} from "./primitives.js";

describe("isolation primitives", () => {
  const tenantScope = { tenantId: "tenant-123", compartments: ["alpha", "bravo"] };

  it("requires tenant scope", () => {
    expect(() => requireTenantScope({})).toThrow(IsolationViolationError);
  });

  it("scopes SQL queries by injecting tenant clause", () => {
    const scoped = scopeSqlToTenant("SELECT * FROM runs", [], tenantScope);
    expect(scoped.text.toLowerCase()).toContain("where tenant_id");
    expect(scoped.values).toContain("tenant-123");
  });

  it("appends tenant guard to existing WHERE clauses before trailing clauses", () => {
    const scoped = scopeSqlToTenant(
      "SELECT * FROM cases WHERE status = $1 ORDER BY created_at DESC",
      ["OPEN"],
      tenantScope
    );
    expect(scoped.text).toContain("AND tenant_id");
    expect(scoped.text).toContain("ORDER BY created_at DESC");
    expect(scoped.values[1]).toBe("tenant-123");
  });

  it("fails closed when tenants do not match", () => {
    expect(() => assertTenantMatch("other", tenantScope)).toThrow(IsolationViolationError);
  });

  it("requires explicit compartment membership", () => {
    expect(() => enforceCompartments(["charlie"], tenantScope)).toThrow(IsolationViolationError);
  });

  it("enforces service isolation across tenant and compartment boundaries", () => {
    expect(() =>
      assertServiceIsolation(
        { tenant: tenantScope },
        { tenantId: "tenant-123", compartments: ["alpha"] },
        { requireCompartments: true }
      )
    ).not.toThrow();
  });

  it("creates scoped parameter payloads for downstream calls", () => {
    const params = createTenantScopedParams(tenantScope, { resourceId: "r1" });
    expect(params).toEqual({
      resourceId: "r1",
      tenantId: "tenant-123",
      compartments: ["alpha", "bravo"],
    });
  });
});
