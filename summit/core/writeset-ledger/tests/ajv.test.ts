import { describe, expect, it } from "vitest";
import { validateAgainstSchema } from "../validation/ajv";

describe("ajv loader", () => {
  it("validates a minimal claim payload", () => {
    const result = validateAgainstSchema("claim.schema.json", {
      claim_id: "claim-001",
      subject: { kind: "entity", id: "entity-a" },
      predicate: "located_in",
      record_time: "2026-03-06T00:00:00Z",
      status: "supported",
      confidence: 0.8,
      uncertainty: 0.1,
      provenance_refs: ["prov-001"],
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects an invalid claim payload", () => {
    const result = validateAgainstSchema("claim.schema.json", {
      claim_id: "bad-claim-id",
      subject: { kind: "entity", id: "entity-a" },
      predicate: "located_in",
      record_time: "not-a-date",
      status: "supported",
      confidence: 9,
      uncertainty: 0.1,
      provenance_refs: [],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
