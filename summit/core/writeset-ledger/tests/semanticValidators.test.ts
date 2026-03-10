import { describe, expect, it } from "vitest";
import type { WriteSet } from "../materializers/materializeViews";
import {
  detectDuplicateBatchSignatures,
  validateLedgerSemanticRules,
  validateWriteSetSemanticRules,
} from "../validation/semanticValidators";

const baseWriteSet: WriteSet = {
  writeset_id: "ws-001",
  batch_signature: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  record_time: "2026-03-06T00:00:00Z",
  writer: {
    actor_id: "agent-a",
    type: "agent",
    version: "1.0.0",
  },
  provenance: [
    {
      provenance_id: "prov-001",
      source_type: "report",
      source_uri: "file://report-a",
      content_hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
  ],
  claims: [
    {
      claim_id: "claim-001",
      subject: { kind: "entity", id: "entity-a" },
      predicate: "located_in",
      object: { kind: "entity", id: "loc-a" },
      record_time: "2026-03-06T00:00:00Z",
      valid_time_start: "2026-03-01T00:00:00Z",
      valid_time_end: "2026-03-02T00:00:00Z",
      confidence: 0.8,
      uncertainty: 0.1,
      status: "supported",
      provenance_refs: ["prov-001"],
    },
  ],
};

describe("semanticValidators", () => {
  it("accepts a valid writeset", () => {
    const issues = validateWriteSetSemanticRules(baseWriteSet);
    expect(issues).toEqual([]);
  });

  it("rejects invalid valid_time range", () => {
    const invalid: WriteSet = {
      ...baseWriteSet,
      writeset_id: "ws-invalid-time",
      claims: [
        {
          ...baseWriteSet.claims[0],
          claim_id: "claim-invalid-time",
          valid_time_start: "2026-03-03T00:00:00Z",
          valid_time_end: "2026-03-02T00:00:00Z",
        },
      ],
    };

    const issues = validateWriteSetSemanticRules(invalid);
    expect(issues.some((i) => i.code === "INVALID_VALID_TIME_RANGE")).toBe(true);
  });

  it("rejects missing provenance reference", () => {
    const invalid: WriteSet = {
      ...baseWriteSet,
      writeset_id: "ws-missing-prov",
      claims: [
        {
          ...baseWriteSet.claims[0],
          claim_id: "claim-missing-prov",
          provenance_refs: ["prov-does-not-exist"],
        },
      ],
    };

    const issues = validateWriteSetSemanticRules(invalid);
    expect(issues.some((i) => i.code === "MISSING_PROVENANCE_REFERENCE")).toBe(true);
  });

  it("detects duplicate batch signatures across writesets", () => {
    const ws2: WriteSet = {
      ...baseWriteSet,
      writeset_id: "ws-002",
    };

    const issues = detectDuplicateBatchSignatures([baseWriteSet, ws2]);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("DUPLICATE_BATCH_SIGNATURE");
  });

  it("returns aggregate ledger validation result", () => {
    const ws2: WriteSet = {
      ...baseWriteSet,
      writeset_id: "ws-002",
    };

    const result = validateLedgerSemanticRules([baseWriteSet, ws2]);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "DUPLICATE_BATCH_SIGNATURE")).toBe(true);
  });
});
