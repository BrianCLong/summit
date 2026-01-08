import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MigrationOrchestrator } from "../src/index.ts";

const orchestrator = new MigrationOrchestrator();

describe("MigrationOrchestrator", () => {
  it("deduplicates identities via domains and SCIM ids", () => {
    const first = orchestrator.identity.mapUser({
      userId: "u1",
      orgId: "o1",
      domains: ["example.com"],
      scimIds: ["scim-1"],
      provenance: ["seed"],
    });
    const merged = orchestrator.identity.mapUser({
      userId: "u2",
      orgId: "o1",
      domains: ["example.com", "alt.com"],
      scimIds: ["scim-1"],
      provenance: ["scim"],
    });

    assert.equal(first.guid, merged.guid);
    assert.ok(merged.domains.includes("alt.com"));
    assert.equal(orchestrator.identity.getIdentity(first.guid)?.provenance.length, 2);
  });

  it("links tenants with audit and rollback checkpoints", () => {
    const link = orchestrator.accountLinks.link("legacy", "new");
    orchestrator.accountLinks.checkpoint("legacy", "new", "preflight");
    orchestrator.accountLinks.rollback("legacy", "new", "parity breach");
    assert.ok(link.checkpoints.includes("preflight"));
    assert.equal(
      link.auditTrail.some((entry) => entry.includes("rollback")),
      true
    );
  });

  it("previews entitlements and detects billing mismatches", () => {
    orchestrator.entitlements.upsertTenantEntitlements({
      tenantId: "t1",
      plan: "pro",
      entitlements: [
        { name: "seats", limit: 10 },
        { name: "storage", limit: 1000, grandfathered: true },
      ],
    });
    orchestrator.entitlements.addBillingSnapshot({
      tenantId: "t1",
      entitlements: [
        { name: "seats", limit: 10 },
        { name: "storage", limit: 800 },
      ],
    });

    const preview = orchestrator.entitlements.previewEntitlements("t1");
    assert.ok(preview.previewNotes);
    const reconciliation = orchestrator.entitlements.reconcileBilling("t1");
    assert.equal(reconciliation.ok, false);
    assert.ok(reconciliation.mismatches.includes("storage"));
  });

  it("runs backfill with checkpoints and DLQ on persistent failure", async () => {
    const framework = orchestrator.backfill(2, 2);
    let attempts = 0;
    const result = await framework.run(
      [1, 2, 3],
      async (value) => {
        if (value === 2 && attempts < 2) {
          attempts += 1;
          throw new Error("transient");
        }
      },
      (index, value) => value === 3 || index === 0
    );

    assert.deepEqual(result.checkpoints, [0, 2]);
    assert.equal(result.processed, 3);
    assert.equal(result.failed, 0);
    assert.equal(result.dlq.length, 0);
  });

  it("produces parity report with sample drift detection", () => {
    const report = orchestrator.parityEngine.computeParity(
      "users",
      [
        { id: "1", payload: { name: "Alice", active: true } },
        { id: "2", payload: { name: "Bob", active: false } },
      ],
      [
        { id: "1", payload: { name: "Alice", active: true } },
        { id: "2", payload: { name: "Bob", active: true } },
      ],
      [
        (legacy, target) => ({
          name: "active parity",
          passed: (legacy as any).active === (target as any).active,
        }),
      ]
    );

    assert.equal(report.countsMatch, true);
    assert.ok(report.sampleDrift[0]);
    assert.ok(report.invariantPassRate < 1);
  });

  it("signs, verifies, and replays integration events", () => {
    orchestrator.integrations.inventory("t1", [
      {
        id: "hook",
        type: "webhook",
        critical: true,
        endpoints: ["https://legacy"],
        health: "degraded",
      },
    ]);
    orchestrator.integrations.dualPublish("t1", { id: "evt-1", payload: { hello: "world" } });
    orchestrator.integrations.dualPublish("t1", { id: "evt-2", payload: { hello: "again" } });

    const signature = orchestrator.integrations.signWebhook("body", "secret");
    assert.equal(orchestrator.integrations.verifyWebhook("body", "secret", signature), true);
    assert.equal(orchestrator.integrations.replayMissed("t1", "evt-1").length, 1);
    assert.equal(orchestrator.integrations.healthSummary("t1").hook, "degraded");
  });

  it("assembles dashboard snapshots with rollback signal and actions", () => {
    orchestrator.lifecycle.setPhase("t1", "ramp");
    orchestrator.ux.setWorkflows("t1", [
      { workflow: "search", status: "matched" },
      { workflow: "export", status: "compat-mode", compatToggleExpiresAt: new Date() },
    ]);
    orchestrator.support.addTicket("t1", { id: "sup-1", severity: "high" });
    orchestrator.reliability.recordSyntheticCheck({
      name: "search",
      latencyMs: 200,
      errorRate: 0.02,
      passed: false,
    });
    orchestrator.reliability.recordDrift(0.05);

    const builder = orchestrator.dashboardBuilder();
    const snapshot = builder.buildSnapshot("t1", [
      {
        entity: "users",
        legacy: [{ id: "1", payload: { active: true } }],
        target: [{ id: "1", payload: { active: true } }],
        invariants: [
          (legacy, target) => ({
            name: "active parity",
            passed: (legacy as any).active === (target as any).active,
          }),
        ],
      },
    ]);

    assert.equal(snapshot.rollbackReady, true);
    assert.ok(snapshot.nextActions[0].action.includes("ramp"));
    assert.equal(snapshot.supportTickets[0].severity, "high");
  });
});
