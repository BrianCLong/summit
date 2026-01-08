import { createHash } from "crypto";
import { addDays } from "date-fns";
import { z } from "zod";
import { AuditLedger } from "../compliance/audit-ledger.js";
import { RecordCompliancePrimitive } from "../compliance/record-compliance-primitive.js";
import { LegalHoldService } from "../compliance/legal-hold-service.js";
import { RetentionEngine } from "../compliance/retention-engine.js";
import type { SourceRecord } from "@intelgraph/mdm-core";

const recordDefinition = {
  type: "case_record",
  description: "Case management record",
  schema: z.object({
    name: z.string(),
    status: z.string(),
  }),
  classification: "restricted" as const,
  retentionPolicy: { name: "default", retentionDays: 30, deleteOnExpiry: false },
};

const goldenConfig = {
  domain: "cases",
  survivorshipRules: [
    { attributeName: "status", strategy: "most_recent", priority: 1 },
    { attributeName: "name", strategy: "most_trusted_source", priority: 1 },
  ],
  enableVersioning: true,
  enableLineageTracking: true,
};

function buildSourceRecord(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    sourceId: "src-1",
    sourceSystem: "crm",
    sourceRecordId: "1",
    data: { name: "Case A", status: "open" },
    lastModified: new Date(),
    confidence: 0.9,
    priority: 10,
    ...overrides,
  };
}

describe("RecordCompliancePrimitive", () => {
  it("creates and updates records with audit trails and versions", async () => {
    const primitive = new RecordCompliancePrimitive(
      goldenConfig,
      [recordDefinition],
      [
        {
          recordType: recordDefinition.type,
          tenantId: "tenant-1",
          policy: recordDefinition.retentionPolicy!,
        },
      ]
    );

    const record = await primitive.createRecord([buildSourceRecord()], {
      recordType: recordDefinition.type,
      tenantId: "tenant-1",
      actor: "alice",
      reason: "initial load",
    });

    expect(record.metadata.recordType).toBe(recordDefinition.type);
    expect(primitive.getAuditEvents(record.id.id)).toHaveLength(1);

    const updated = await primitive.updateRecord(
      record.id.id,
      [
        buildSourceRecord({
          data: { name: "Case A", status: "closed" },
          lastModified: addDays(new Date(), 1),
        }),
      ],
      {
        recordType: recordDefinition.type,
        tenantId: "tenant-1",
        actor: "bob",
        reason: "status change",
      }
    );

    expect(updated.version).toBe(2);
    const versions = primitive.getVersions(record.id.id);
    expect(versions).toHaveLength(2);
    expect(versions[1]?.diff?.status?.current).toBe("closed");

    const integrity = primitive.runIntegrityCheck();
    expect(integrity.auditChainValid).toBe(true);
    expect(integrity.versionChecksumsMatch).toBe(true);
  });

  it("blocks expiry when a legal hold is applied", async () => {
    const legalHold = new LegalHoldService();
    const retention = new RetentionEngine(legalHold);
    const primitive = new RecordCompliancePrimitive(
      goldenConfig,
      [recordDefinition],
      [
        {
          recordType: recordDefinition.type,
          tenantId: "tenant-2",
          policy: { name: "short", retentionDays: 1, deleteOnExpiry: true },
        },
      ],
      { legalHold, retention }
    );

    const record = await primitive.createRecord(
      [buildSourceRecord({ sourceRecordId: "2", lastModified: addDays(new Date(), -40) })],
      { recordType: recordDefinition.type, tenantId: "tenant-2", actor: "alice" }
    );

    record.createdAt = addDays(new Date(), -40);
    primitive.applyLegalHold(record.id.id, "investigation", "records_officer");
    const evaluation = primitive.evaluateRetention(record.id.id);

    expect(evaluation.holds.length).toBe(1);
    expect(evaluation.expired).toBe(false);
  });

  it("builds certified export packs with stable hashes", async () => {
    const primitive = new RecordCompliancePrimitive(
      goldenConfig,
      [recordDefinition],
      [
        {
          recordType: recordDefinition.type,
          tenantId: "tenant-3",
          policy: recordDefinition.retentionPolicy!,
        },
      ]
    );

    const record = await primitive.createRecord([buildSourceRecord({ sourceRecordId: "3" })], {
      recordType: recordDefinition.type,
      tenantId: "tenant-3",
      actor: "carol",
    });

    const pack = primitive.exportRecords([record.id.id], {
      requestedBy: "auditor",
      recordType: recordDefinition.type,
      tenantId: "tenant-3",
    });

    expect(pack.manifest.recordIds).toContain(record.id.id);
    expect(pack.packHash).toBeDefined();
    const recomputed = createHash("sha256")
      .update(
        JSON.stringify({
          manifest: pack.manifest,
          recordHash: pack.manifest.recordHash,
          auditTrailHash: pack.manifest.auditTrailHash,
          versionHash: pack.manifest.versionHash,
        })
      )
      .digest("hex");

    expect(pack.packHash).toBe(recomputed);
  });
});

describe("AuditLedger", () => {
  it("detects tampering via hash chain", () => {
    const ledger = new AuditLedger();
    ledger.recordEvent({
      recordId: "1",
      recordType: "case_record",
      tenantId: "tenant-1",
      actor: "alice",
      action: "create",
    });
    const event = ledger.recordEvent({
      recordId: "1",
      recordType: "case_record",
      tenantId: "tenant-1",
      actor: "bob",
      action: "update",
    });

    expect(ledger.verifyIntegrity()).toBe(true);

    // Tamper with the second event
    (event as unknown as { actor: string }).actor = "mallory";
    expect(ledger.verifyIntegrity()).toBe(false);
  });
});
