import { describe, expect, it } from "vitest";
import { createRecordFramework, createScopedRecordApi, RecordMetadataSchema } from "./framework.js";
import { createRetentionEngine, RetentionPolicySchema } from "../retention/engine.js";

const baseMetadata = RecordMetadataSchema.parse({
  owner: "investigations-team",
  classification: "confidential",
  retentionClass: "casefiles",
  provenance: { source: "ingest-service", transforms: [], exports: [] },
  tags: ["custodian-123"],
});

describe("RecordFramework", () => {
  it("creates records, versions, and exports bundles with integrity guarantees", () => {
    const framework = createRecordFramework();
    framework.registerDomain({ domain: "event", requiredFields: ["actor", "action"] });

    framework.registerTemplate({
      id: "audit-event",
      name: "Audit Event",
      description: "Standard audit record",
      domain: "event",
      defaultMetadata: baseMetadata,
      requiredFields: ["actor", "action"],
    });

    const record = framework.applyTemplate("audit-event", {
      data: { actor: "alice", action: "login" },
      createdBy: "alice",
    });

    expect(record.metadata.templateId).toBe("audit-event");

    const version = framework.appendVersion(
      record.id,
      { actor: "alice", action: "logout" },
      "alice",
      "session end"
    );
    expect(version.diff?.action).toEqual({ before: "login", after: "logout" });

    const searchResults = framework.search({ classification: "confidential", domain: "event" });
    expect(searchResults).toHaveLength(1);

    const bundle = framework.exportBundle([record.id]);
    expect(bundle.manifest[0].hash).toBe(record.versions.at(-1)?.hash);
    expect(bundle.bundleHash).toBeDefined();

    const violations = framework.verifyIntegrity(record.id);
    expect(violations).toHaveLength(0);

    expect(framework.getAuditTrail().verifyChain()).toBe(true);

    const integrityRun = framework.runIntegrityJob();
    expect(integrityRun.violations).toHaveLength(0);
    expect(framework.getIntegrityStatus()).toEqual(integrityRun);
  });

  it("enforces append-only protections and scoped access controls", () => {
    const framework = createRecordFramework();
    const scoped = createScopedRecordApi(framework, {
      allowedDomains: ["file"],
      allowedClassifications: ["confidential"],
      owners: ["investigations-team"],
    });

    const record = scoped.create({
      domain: "file",
      type: "Export Artifact",
      immutability: "append-only",
      metadata: baseMetadata,
      data: { uri: "s3://bucket/doc.pdf" },
      createdBy: "analyst",
    });

    expect(() => scoped.append(record.id, { uri: "s3://bucket/doc2.pdf" }, "analyst")).toThrow(
      /Append-only records cannot modify existing fields/
    );

    expect(() =>
      createScopedRecordApi(framework, { allowedDomains: ["object"] }).append(
        record.id,
        { uri: "x" },
        "user"
      )
    ).toThrow("Domain not permitted for actor");
  });
});

describe("RetentionEngine", () => {
  it("enforces policies, legal holds, and DSAR propagation", () => {
    const framework = createRecordFramework();
    const retention = createRetentionEngine(framework);

    retention.registerDefault(
      "casefiles",
      RetentionPolicySchema.parse({
        id: "default-casefile",
        recordType: "Audit Event",
        tier: "regulatory",
        durationDays: 0,
        deletionMode: "soft",
        propagateToDerived: true,
      })
    );

    const parent = framework.createRecord({
      domain: "object",
      type: "Case Note",
      immutability: "versioned",
      metadata: baseMetadata,
      data: { note: "sensitive", subject: "custodian-123" },
      createdBy: "analyst",
    });

    const child = framework.createRecord({
      domain: "file",
      type: "Export Artifact",
      immutability: "append-only",
      metadata: { ...baseMetadata, tags: ["custodian-123", "derived"] },
      data: { uri: "s3://bucket/doc.pdf" },
      createdBy: "analyst",
      lineage: { parents: [parent.id] },
    });

    framework.addChild(parent.id, child.id);

    retention.placeLegalHold({
      id: "hold-1",
      reason: "investigation",
      scope: { recordIds: [parent.id], recordTypes: [] },
      createdBy: "compliance",
    });

    const preview = retention.previewDeletion(new Date(Date.now() + 86400000));
    expect(preview.blockedByHold).toContain(parent.id);

    const result = retention.executeDeletion("compliance-bot", preview);
    expect(result.deleted).toContain(child.id);
    expect(result.skipped).toContain(parent.id);

    const dsar = retention.dsar("custodian-123");
    const ids = dsar.records.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([parent.id, child.id]));
    expect(dsar.propagation).toEqual(expect.arrayContaining([child.id, parent.id]));

    const report = retention.report(new Date(Date.now() + 86400000 * 2));
    expect(report.policyCount).toBeGreaterThan(0);
    expect(report.blockedRecords).toContain(parent.id);
  });
});
