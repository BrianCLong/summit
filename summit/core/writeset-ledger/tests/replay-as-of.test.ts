import { describe, expect, it } from "vitest";
import { materializeViews, resolveActiveClaims, type WriteSet } from "../materializers/materializeViews";

const writesets: WriteSet[] = [
  {
    writeset_id: "ws-001",
    record_time: "2026-03-01T10:00:00Z",
    writer: { actor_id: "agent-ingest", type: "agent", version: "1.0.0" },
    provenance: [
      {
        provenance_id: "prov-001",
        source_type: "report",
        source_uri: "file://report-1",
        content_hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    ],
    claims: [
      {
        claim_id: "claim-001",
        subject: { kind: "entity", id: "entity-a" },
        predicate: "located_in",
        object: { kind: "entity", id: "loc-x" },
        record_time: "2026-03-01T10:00:00Z",
        confidence: 0.7,
        uncertainty: 0.2,
        status: "supported",
        graph_target: "RG",
        provenance_refs: ["prov-001"]
      }
    ]
  },
  {
    writeset_id: "ws-002",
    record_time: "2026-03-03T10:00:00Z",
    writer: { actor_id: "analyst-1", type: "human", version: "1.0.0" },
    provenance: [
      {
        provenance_id: "prov-002",
        source_type: "report",
        source_uri: "file://report-2",
        content_hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      }
    ],
    claims: [
      {
        claim_id: "claim-002",
        subject: { kind: "entity", id: "entity-a" },
        predicate: "located_in",
        object: { kind: "entity", id: "loc-y" },
        record_time: "2026-03-03T10:00:00Z",
        confidence: 0.92,
        uncertainty: 0.05,
        status: "validated",
        graph_target: "RG",
        supersedes: ["claim-001"],
        provenance_refs: ["prov-002"]
      }
    ]
  }
];

describe("replay as-of", () => {
  it("materializes only claims known by the as-of date", () => {
    const views = materializeViews(writesets, {
      asOfRecordTime: "2026-03-02T00:00:00Z"
    });

    expect(views.RG.edges).toHaveLength(1);
    expect(views.RG.edges[0].claim_id).toBe("claim-001");
  });

  it("resolves active claims after supersession", () => {
    const allClaims = writesets.flatMap((w) => w.claims);
    const active = resolveActiveClaims(allClaims, "2026-03-04T00:00:00Z");

    expect(active.has("claim-001")).toBe(false);
    expect(active.has("claim-002")).toBe(true);
  });
});
