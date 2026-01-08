import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AIReadinessControlPlane,
  DataQualityGate,
  FeatureStore,
  InMemoryEventBus,
  IntentTelemetry,
  ModelRegistry,
  PiiGuard,
  ProvenanceTracker,
  RetrievalIndex,
  SchemaRegistry,
} from "../src/index.js";

const now = new Date().toISOString();

describe("SchemaRegistry", () => {
  it("validates canonical entities against registered schemas", () => {
    const registry = new SchemaRegistry();
    registry.register({
      name: "user",
      version: "1.0.0",
      schema: {
        type: "object",
        properties: { id: { type: "string" }, email: { type: "string" } },
        required: ["id", "email"],
      },
    });

    expect(registry.validate("user", { id: "u1", email: "a@example.com" }).valid).toBe(true);
    const result = registry.validate("user", { id: "u1" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("email");
  });
});

describe("IntentTelemetry", () => {
  it("captures user intent events and broadcasts on the bus", async () => {
    const bus = new InMemoryEventBus();
    const telemetry = new IntentTelemetry(bus);
    const handler = vi.fn();
    telemetry.subscribe("request", handler);

    telemetry.log({
      id: "evt-1",
      intent: "request",
      actor: "alice",
      surface: "ui",
      targetEntity: "ticket",
      targetId: "t-1",
      tenantId: "tenant-1",
      occurredAt: now,
    });

    expect(telemetry.getRecorded()).toHaveLength(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("DataQualityGate", () => {
  it("flags stale, null, and duplicate records", () => {
    const alerts: string[] = [];
    const gate = new DataQualityGate({
      sendAlert: (alert) => alerts.push(`${alert.reason}:${alert.records.length}`),
    });

    const records = [
      {
        id: "1",
        updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        email: "a@example.com",
      },
      { id: "2", updatedAt: now, email: null },
      { id: "2", updatedAt: now, email: "b@example.com" },
    ];

    const report = gate.evaluate("users", records, {
      freshnessMinutes: 60,
      requiredFields: ["email"],
      dedupeKey: "id",
    });

    expect(report.freshnessViolation).toBeDefined();
    expect(report.nullViolations).toHaveLength(1);
    expect(report.duplicateViolations).toHaveLength(1);
    expect(report.quarantined).toHaveLength(2);
    expect(alerts.length).toBeGreaterThan(0);
  });
});

describe("RetrievalIndex", () => {
  it("detects documents that need refresh based on interval", () => {
    const index = new RetrievalIndex();
    index.add({
      id: "doc-1",
      title: "Runbook",
      owner: "sre",
      tags: ["operations"],
      refreshIntervalMinutes: 30,
      lastRefreshedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      link: "https://example.com",
    });

    const due = index.dueForRefresh();
    expect(due).toHaveLength(1);
  });
});

describe("FeatureStore", () => {
  it("stores features with TTL and supports idempotent backfill", async () => {
    const store = new FeatureStore();
    const createdAt = new Date(Date.now() - 1000 * 60 * 59).toISOString();
    store.upsert({
      key: "feat-1",
      value: { score: 0.9 },
      lineage: ["dataset-1"],
      ttlMinutes: 60,
      createdAt,
      version: "1.0.0",
      sourceArtifacts: ["artifact-1"],
    });

    const result = store.get("feat-1");
    expect(result?.lineage).toContain("dataset-1");

    const jobResults = await store.backfill({
      id: "job-1",
      inputs: [{ id: "2" }],
      compute: async (input) => ({
        key: `feat-${input.id}`,
        value: { score: 0.7 },
        lineage: ["dataset-2"],
        ttlMinutes: 30,
        createdAt: now,
        version: "1.0.1",
        sourceArtifacts: ["artifact-2"],
      }),
    });

    expect(jobResults).toHaveLength(1);
    expect(store.get("feat-2")?.version).toBe("1.0.1");
  });
});

describe("PII guard", () => {
  it("redacts and hashes configured paths", () => {
    const guard = new PiiGuard([
      { path: "email", action: "redact" },
      { path: "ssn", action: "hash" },
      { path: "address.line1", action: "drop" },
    ]);
    const redacted = guard.redact({
      email: "a@example.com",
      ssn: "123-45-6789",
      address: { line1: "123 Main", city: "NYC" },
    });

    expect(redacted.email).toBe("[REDACTED]");
    expect(redacted.ssn).not.toBe("123-45-6789");
    expect((redacted.address as Record<string, unknown>).line1).toBeUndefined();
  });
});

describe("ProvenanceTracker", () => {
  it("links AI outputs to artifacts and captures feedback", () => {
    const tracker = new ProvenanceTracker();
    tracker.record({
      outputId: "out-1",
      artifactIds: ["doc-1"],
      sourceInputs: { prompt: "hello" },
      createdAt: now,
      citations: ["doc-1"],
    });

    tracker.attachFeedback("out-1", {
      outputId: "out-1",
      actor: "alice",
      helpful: false,
      reason: "Incorrect steps",
      recordedAt: now,
    });

    expect(tracker.get("out-1")?.feedback?.reason).toBe("Incorrect steps");
  });
});

describe("ModelRegistry", () => {
  it("tracks versions and rollbacks with release linkage", () => {
    const models = new ModelRegistry();
    models.register({
      modelId: "copilot",
      version: "1.0.0",
      release: "2024.10",
      metrics: { precision: 0.92 },
    });
    models.register({
      modelId: "copilot",
      version: "1.1.0",
      release: "2024.11",
      metrics: { precision: 0.94 },
    });

    expect(models.latest("copilot")?.version).toBe("1.1.0");
    models.rollback("copilot", "1.1.0", "regression detected");
    expect(models.latest("copilot")?.rolledBack).toBe(true);
  });
});

describe("AIReadinessControlPlane", () => {
  let plane: AIReadinessControlPlane;
  let alerts: string[];

  beforeEach(() => {
    alerts = [];
    plane = new AIReadinessControlPlane(
      {
        piiRules: [
          { path: "email", action: "redact" },
          { path: "creditCard.number", action: "drop" },
        ],
        alertSink: {
          sendAlert: (alert) => alerts.push(`${alert.table}:${alert.reason}`),
        },
      },
      new InMemoryEventBus()
    );

    plane.registerSchema({
      name: "ticket",
      version: "1.0.0",
      schema: {
        type: "object",
        properties: { id: { type: "string" }, summary: { type: "string" } },
        required: ["id", "summary"],
      },
    });
  });

  it("validates, redacts, and logs provenance end-to-end", async () => {
    const { validated, redacted, piiTags } = plane.validateAndSanitize("ticket", {
      id: "t-1",
      summary: "Help",
      email: "sensitive@example.com",
      creditCard: { number: "4111111111111111" },
    });

    expect(validated).toBe(true);
    expect(redacted.email).toBe("[REDACTED]");
    expect((redacted.creditCard as Record<string, unknown>).number).toBeUndefined();
    expect(piiTags).toContain("email");

    plane.logIntent({
      id: "evt-2",
      intent: "approve",
      actor: "moderator",
      surface: "ui",
      targetEntity: "ticket",
      targetId: "t-1",
      tenantId: "tenant-1",
      occurredAt: now,
    });

    const quality = plane.enforceDataQuality(
      "tickets",
      [
        {
          id: "t-1",
          updatedAt: new Date(Date.now() - 1000 * 60 * 61).toISOString(),
          summary: "Help",
        },
        { id: "t-1", updatedAt: now, summary: "Help" },
      ],
      { freshnessMinutes: 60, dedupeKey: "id", requiredFields: ["summary"] }
    );

    expect(quality.duplicateViolations).toHaveLength(1);
    expect(alerts).not.toHaveLength(0);

    plane.indexDocument({
      id: "doc-1",
      title: "Runbook",
      owner: "sre",
      tags: ["operations"],
      refreshIntervalMinutes: 1,
      link: "https://example.com",
    });
    expect(plane.documentsNeedingRefresh(now)).toHaveLength(1);

    await plane.scheduleBackfill({
      id: "bf-1",
      inputs: [{ id: "t-1" }],
      allowOverwrite: true,
      compute: async (input) => ({
        key: `feature-${input.id}`,
        value: { urgency: "high" },
        lineage: ["ticket"],
        ttlMinutes: 30,
        createdAt: now,
        version: "1.0.0",
        sourceArtifacts: ["doc-1"],
      }),
    });

    expect(plane.fetchFeature("feature-t-1")?.version).toBe("1.0.0");

    plane.trackProvenance({
      outputId: "out-2",
      artifactIds: ["doc-1"],
      sourceInputs: { ticketId: "t-1" },
      createdAt: now,
      citations: ["doc-1"],
    });

    plane.attachFeedback("out-2", {
      outputId: "out-2",
      actor: "agent",
      helpful: true,
      recordedAt: now,
    });

    plane.recordModel({
      modelId: "assist",
      version: "1.0.0",
      release: "2024.12",
      metrics: { precision: 0.93 },
    });

    const snapshot = plane.snapshot();
    expect(snapshot.models).toHaveLength(1);
    expect(snapshot.pendingFeatures.length).toBeGreaterThanOrEqual(0);
    expect(snapshot.provenance[0].feedback?.helpful).toBe(true);
  });
});
