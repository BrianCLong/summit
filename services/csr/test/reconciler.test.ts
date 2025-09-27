import { describe, expect, it, beforeEach } from "vitest";
import ConsentStateReconciler from "../src/reconciler";
import { ConsentRecord } from "../src/types";

const baseRecord = {
  userId: "user-123",
  consentType: "email_marketing",
  channel: "email",
};

describe("ConsentStateReconciler", () => {
  let reconciler: ConsentStateReconciler;

  beforeEach(() => {
    reconciler = new ConsentStateReconciler();
  });

  it("resolves conflicts using source precedence", () => {
    const partnerRecord: ConsentRecord = {
      ...baseRecord,
      recordId: "r-1",
      source: "partner",
      status: "denied",
      timestamp: "2024-05-01T00:00:00Z",
    };

    const crmRecord: ConsentRecord = {
      ...baseRecord,
      recordId: "r-2",
      source: "crm",
      status: "granted",
      timestamp: "2024-05-01T01:00:00Z",
    };

    reconciler.ingest([partnerRecord]);
    const result = reconciler.ingest([crmRecord]);

    expect(result.proofs[0].winningState?.source).toEqual("crm");
    expect(result.proofs[0].winningState?.status).toEqual("granted");
    expect(
      result.proofs[0].appliedRules.some(
        (rule) => rule.rule === "SOURCE_PRECEDENCE" && rule.winner === "incoming",
      ),
    ).toBe(true);
  });

  it("uses recency when precedence ties", () => {
    const oldRecord: ConsentRecord = {
      ...baseRecord,
      recordId: "r-3",
      source: "app_sdk",
      status: "denied",
      timestamp: "2024-05-01T00:00:00Z",
    };

    const recentRecord: ConsentRecord = {
      ...baseRecord,
      recordId: "r-4",
      source: "app_sdk",
      status: "granted",
      timestamp: "2024-05-02T00:00:00Z",
    };

    reconciler.ingest([oldRecord]);
    const result = reconciler.ingest([recentRecord]);

    expect(result.proofs[0].winningState?.status).toEqual("granted");
    expect(result.proofs[0].changed).toBe(true);
    expect(
      result.proofs[0].appliedRules.some(
        (rule) => rule.rule === "RECENCY" && rule.winner === "incoming",
      ),
    ).toBe(true);
  });

  it("ignores duplicate records deterministically", () => {
    const record: ConsentRecord = {
      ...baseRecord,
      recordId: "r-5",
      source: "crm",
      status: "granted",
      timestamp: "2024-05-03T00:00:00Z",
    };

    const first = reconciler.ingest([record]);
    const second = reconciler.ingest([record]);

    expect(first.proofs[0].changed).toBe(true);
    expect(second.proofs[0].changed).toBe(false);
    expect(
      second.proofs[0].appliedRules.find((rule) => rule.rule === "DUPLICATE_RECORD")?.winner,
    ).toEqual("none");
  });

  it("produces diff snapshots and supports rollback", () => {
    const baselineRecord: ConsentRecord = {
      ...baseRecord,
      recordId: "r-6",
      source: "crm",
      status: "granted",
      timestamp: "2024-05-04T00:00:00Z",
    };

    const updateRecord: ConsentRecord = {
      ...baseRecord,
      recordId: "r-7",
      source: "crm",
      status: "denied",
      timestamp: "2024-05-05T00:00:00Z",
    };

    const baselineResult = reconciler.ingest([baselineRecord]);
    const baselineSnapshotId = baselineResult.snapshotId;

    reconciler.ingest([updateRecord]);

    const diff = reconciler.diff({});

    expect(diff.differences.length).toBeGreaterThan(0);

    const rollbackResult = reconciler.rollback(baselineSnapshotId);
    const current = reconciler.getCurrentSnapshot();
    const targetSnapshot = reconciler
      .listSnapshots()
      .find((snapshot) => snapshot.id === baselineSnapshotId);

    expect(rollbackResult.restoredFrom).toEqual(baselineSnapshotId);
    expect(current.state).toEqual(targetSnapshot?.state);
  });
});
