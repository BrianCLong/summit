import { describe, expect, it } from "vitest";
import { explainClaimLineage, type Claim } from "../materializers/materializeViews";

const claims: Claim[] = [
  {
    claim_id: "claim-200",
    subject: { kind: "entity", id: "actor-x" },
    predicate: "believes",
    object: { kind: "claim", id: "claim-201" },
    record_time: "2026-03-01T00:00:00Z",
    confidence: 0.66,
    uncertainty: 0.22,
    status: "supported",
    graph_target: "BG",
    provenance_refs: ["prov-200"]
  },
  {
    claim_id: "claim-202",
    subject: { kind: "document", id: "doc-1" },
    predicate: "supports",
    object: { kind: "claim", id: "claim-200" },
    record_time: "2026-03-01T00:01:00Z",
    confidence: 0.9,
    uncertainty: 0.05,
    status: "validated",
    supports: ["claim-200"],
    provenance_refs: ["prov-202"]
  },
  {
    claim_id: "claim-203",
    subject: { kind: "entity", id: "actor-y" },
    predicate: "contradicts",
    object: { kind: "claim", id: "claim-200" },
    record_time: "2026-03-02T00:00:00Z",
    confidence: 0.7,
    uncertainty: 0.15,
    status: "contested",
    contradicts: ["claim-200"],
    provenance_refs: ["prov-203"]
  }
];

describe("explain chain completeness", () => {
  it("returns support and contradiction chains", () => {
    const lineage = explainClaimLineage("claim-200", claims);

    expect(lineage.claim?.claim_id).toBe("claim-200");
    expect(lineage.supportedBy.map((c) => c.claim_id)).toEqual(["claim-202"]);
    expect(lineage.contradictedBy.map((c) => c.claim_id)).toEqual(["claim-203"]);
  });
});
