import { describe, expect, it } from "vitest";
import { explainClaimLineage, materializeViews, type Claim, type WriteSet } from "../materializers/materializeViews";

const claims: Claim[] = [
  {
    claim_id: "claim-100",
    subject: { kind: "event", id: "event-1" },
    predicate: "occurred_at",
    object: { kind: "entity", id: "loc-x" },
    record_time: "2026-03-01T00:00:00Z",
    confidence: 0.8,
    uncertainty: 0.1,
    status: "supported",
    provenance_refs: ["prov-100"]
  },
  {
    claim_id: "claim-101",
    subject: { kind: "event", id: "event-1" },
    predicate: "occurred_at",
    object: { kind: "entity", id: "loc-y" },
    record_time: "2026-03-02T00:00:00Z",
    confidence: 0.85,
    uncertainty: 0.1,
    status: "contested",
    contradicts: ["claim-100"],
    provenance_refs: ["prov-101"]
  }
];

const writesets: WriteSet[] = [
  {
    writeset_id: "ws-100",
    record_time: "2026-03-02T00:00:00Z",
    writer: { actor_id: "agent-1", type: "agent", version: "1.0.0" },
    provenance: [
      {
        provenance_id: "prov-100",
        source_type: "report",
        source_uri: "file://a",
        content_hash: "cccccccccccccccccccccccccccccccc"
      },
      {
        provenance_id: "prov-101",
        source_type: "report",
        source_uri: "file://b",
        content_hash: "dddddddddddddddddddddddddddddddd"
      }
    ],
    claims
  }
];

describe("contradiction history", () => {
  it("materializes contradiction edges", () => {
    const views = materializeViews(writesets);
    expect(views.contradictions).toHaveLength(1);
    expect(views.contradictions[0]).toEqual({
      claim_id: "claim-101",
      contradicts: ["claim-100"]
    });
  });

  it("explains contradiction lineage", () => {
    const lineage = explainClaimLineage("claim-100", claims);
    expect(lineage.contradictedBy.map((c) => c.claim_id)).toEqual(["claim-101"]);
  });
});
