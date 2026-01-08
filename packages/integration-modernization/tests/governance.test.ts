import { Governance } from "../src/governance";
import { CostPerformanceTracker } from "../src/costPerformance";
import { ConnectorMetadata } from "../src/types";

describe("Governance and CostPerformanceTracker", () => {
  const connector: ConnectorMetadata = {
    id: "billing",
    name: "Billing",
    kind: "push",
    owner: { team: "billing" },
    contract: {
      versioning: { current: "1.0.0", supported: ["1.0.0"] },
      pagination: { type: "none" },
      errors: { retryableErrors: [], fatalErrors: [] },
      idempotency: { idempotencyKeyHeader: "Idempotency-Key", dedupeWindowSeconds: 120 },
    },
  };

  it("tracks ownership, deprecation, release notes, and cost summaries", () => {
    const governance = new Governance();
    governance.registerConnector(connector);
    governance.markDeprecated({
      connectorId: connector.id,
      reason: "superseded",
      sunsetAt: Date.now() + 1000,
    });
    governance.addReleaseNote({
      connectorId: connector.id,
      message: "Added retries",
      publishedAt: Date.now(),
    });
    governance.contractChangeWorkflow(
      "billing.event",
      { name: "billing.event", version: "1.0.0", requiredFields: ["id"] },
      { name: "billing.event", version: "1.1.0", requiredFields: ["id", "amount"] }
    );

    expect(governance.ownershipAudit()[0].id).toBe("billing");
    expect(governance.deprecationSlate().length).toBe(1);
    expect(governance.notesFor(connector.id).length).toBe(1);
    expect(governance.reviews().pendingCompatibility).toBe(1);

    const tracker = new CostPerformanceTracker();
    tracker.recordSample({
      connectorId: connector.id,
      computeMs: 10,
      apiCalls: 2,
      storageBytes: 100,
      egressBytes: 50,
    });
    tracker.recordSample({
      connectorId: connector.id,
      computeMs: 20,
      apiCalls: 1,
      storageBytes: 50,
      egressBytes: 25,
    });
    expect(tracker.summary(connector.id)).toEqual({
      computeMs: 30,
      apiCalls: 3,
      storageBytes: 150,
      egressBytes: 75,
      samples: 2,
    });
    tracker.cacheResponse(connector.id, "profile", { id: 1 }, 10);
    expect(tracker.getCached(connector.id, "profile")).toEqual({ id: 1 });
  });
});
