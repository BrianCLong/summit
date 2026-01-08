import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  calculateProratedCredit,
  compareCloudEvents,
  ContractRegistry,
  detectUsageAnomalies,
  enforceAcyclicDependencies,
  evaluateEntitlement,
  validateApiContract,
  validateEventContract,
  validateIdentifiers,
  isApiContractCompatible,
} from "../..";

const sampleApiContract = {
  module: "identity-and-accounts",
  name: "create-service-account",
  version: "v1",
  style: "rest" as const,
  path: "/v1/service-accounts",
  idempotent: true,
  owner: "identity-platform",
  resources: ["service-account"],
  sla: { latencyMsP99: 250, availabilityPercent: 99.9, errorBudgetPercent: 1 },
};

const sampleEvent = {
  id: "evt-123",
  source: "identity-and-accounts",
  type: "service-account.created",
  specversion: "1.0",
  data: { userId: "user-1" },
  tenant_id: "tenant-1",
  resource_id: "service-account-1",
  provenance: { emitter: "identity", version: "v1", domain: "identity" },
};

describe("domain identifiers", () => {
  it("validates canonical identifiers", () => {
    const identifiers = validateIdentifiers({
      tenantId: "tenant-123",
      accountId: "acct-123",
      orgId: "org-123",
      userId: "user-123",
      serviceAccountId: "svc-123",
      workspaceId: "ws-123",
      teamId: "team-123",
      roleId: "role-123",
      planId: "plan-123",
      entitlementId: "ent-123",
      resourceId: "res-123",
      eventId: "evt-123",
    });

    expect(identifiers.tenantId).toBe("tenant-123");
  });
});

describe("contract validation", () => {
  it("accepts valid API and event contracts", () => {
    const contract = validateApiContract(sampleApiContract);
    const event = validateEventContract(sampleEvent);

    expect(contract.version).toBe("v1");
    expect(event.tenant_id).toBe("tenant-1");
  });

  it("detects compatibility regressions", () => {
    const nextContract = {
      ...sampleApiContract,
      resources: ["service-account"],
      sla: { ...sampleApiContract.sla, latencyMsP99: 500 },
    };

    const report = isApiContractCompatible(sampleApiContract, nextContract);
    expect(report.compatible).toBe(false);
    expect(report.reasons).toContain("latency regression");
  });

  it("detects event field removal as incompatible", () => {
    const nextEvent = { ...sampleEvent, data: {} };
    const result = compareCloudEvents(sampleEvent, nextEvent);
    expect(result.compatible).toBe(false);
    expect(result.issues).toContain("missing data fields: userId");
  });
});

describe("registry", () => {
  it("registers canonical contracts", () => {
    const registry = new ContractRegistry();
    registry.register({ api: sampleApiContract, events: [sampleEvent] });
    const stored = registry.get("identity-and-accounts", "create-service-account", "v1");

    expect(stored?.api.name).toBe(sampleApiContract.name);
  });
});

describe("dependency enforcement", () => {
  it("detects circular dependencies across workspace packages", () => {
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), "dep-graph-"));
    const packagesDir = path.join(tmpDir, "packages");
    fs.mkdirSync(packagesDir);
    ["pkg-a", "pkg-b"].forEach((dir) => fs.mkdirSync(path.join(packagesDir, dir)));

    fs.writeFileSync(
      path.join(packagesDir, "pkg-a", "package.json"),
      JSON.stringify(
        { name: "pkg-a", version: "1.0.0", dependencies: { "pkg-b": "1.0.0" } },
        null,
        2
      )
    );

    fs.writeFileSync(
      path.join(packagesDir, "pkg-b", "package.json"),
      JSON.stringify(
        { name: "pkg-b", version: "1.0.0", dependencies: { "pkg-a": "1.0.0" } },
        null,
        2
      )
    );

    const result = enforceAcyclicDependencies(tmpDir);
    expect(result.compliant).toBe(false);
    expect(result.cycles[0].sort()).toEqual(["pkg-a", "pkg-b"].sort());
  });
});

describe("entitlements", () => {
  it("enforces limits and detects anomalies", () => {
    const entitlement = {
      planId: "pro",
      module: "navigation-shell",
      feature: "command-palette",
      limit: 100,
    };
    const usage = [
      { tenantId: "t-1", feature: "command-palette", count: 30, occurredAt: new Date() },
      { tenantId: "t-1", feature: "command-palette", count: 60, occurredAt: new Date() },
    ];

    const evalResult = evaluateEntitlement(entitlement, usage);
    expect(evalResult.allowed).toBe(true);
    expect(evalResult.remaining).toBe(10);

    const anomalies = detectUsageAnomalies(entitlement, [
      ...usage,
      { tenantId: "t-1", feature: "command-palette", count: 300, occurredAt: new Date() },
    ]);
    expect(anomalies[0].actual).toBeGreaterThan(entitlement.limit);
  });

  it("calculates proration with unused credit and upgrades", () => {
    const credit = calculateProratedCredit({
      oldLimit: 100,
      newLimit: 200,
      daysUsed: 10,
      daysInPeriod: 30,
    });
    expect(credit).toBeGreaterThan(0);
  });
});
