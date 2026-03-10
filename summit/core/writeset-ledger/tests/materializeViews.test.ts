import { describe, expect, it } from "vitest";
import { materializeViews, inferGraphTarget, type Claim, type WriteSet } from "../materializers/materializeViews";

const baseProvenance = {
  provenance_id: "prov-001",
  source_type: "report" as const,
  source_uri: "file://seed-report",
  content_hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

function mkClaim(overrides: Partial<Claim>): Claim {
  return {
    claim_id: "claim-default",
    subject: { kind: "entity", id: "entity-1" },
    predicate: "located_in",
    object: { kind: "entity", id: "loc-1" },
    record_time: "2026-03-06T00:00:00Z",
    confidence: 0.8,
    uncertainty: 0.1,
    status: "supported",
    provenance_refs: ["prov-001"],
    ...overrides,
  };
}

const writeset: WriteSet = {
  writeset_id: "ws-graph-targets",
  record_time: "2026-03-06T00:00:00Z",
  writer: {
    actor_id: "agent-test",
    type: "agent",
    version: "1.0.0",
  },
  provenance: [baseProvenance],
  claims: [
    mkClaim({
      claim_id: "claim-rg",
      predicate: "located_in",
    }),
    mkClaim({
      claim_id: "claim-bg",
      predicate: "believes",
      object: { kind: "claim", id: "claim-rg" },
    }),
    mkClaim({
      claim_id: "claim-ng",
      predicate: "amplifies",
      object: { kind: "narrative", id: "narrative-1" },
    }),
    mkClaim({
      claim_id: "claim-tg",
      predicate: "intends",
      object: { kind: "goal", id: "goal-1" },
    }),
    mkClaim({
      claim_id: "claim-pg",
      predicate: "executes",
      object: { kind: "action", id: "action-1" },
    }),
  ],
};

describe("inferGraphTarget", () => {
  it("infers RG/BG/NG/TG/PG from predicate families", () => {
    expect(inferGraphTarget(writeset.claims[0])).toBe("RG");
    expect(inferGraphTarget(writeset.claims[1])).toBe("BG");
    expect(inferGraphTarget(writeset.claims[2])).toBe("NG");
    expect(inferGraphTarget(writeset.claims[3])).toBe("TG");
    expect(inferGraphTarget(writeset.claims[4])).toBe("PG");
  });
});

describe("materializeViews graph inference", () => {
  it("routes claims into the proper graph views", () => {
    const views = materializeViews([writeset]);

    expect(views.RG.edges.map((e) => e.claim_id)).toEqual(["claim-rg"]);
    expect(views.BG.edges.map((e) => e.claim_id)).toEqual(["claim-bg"]);
    expect(views.NG.edges.map((e) => e.claim_id)).toEqual(["claim-ng"]);
    expect(views.TG.edges.map((e) => e.claim_id)).toEqual(["claim-tg"]);
    expect(views.PG.edges.map((e) => e.claim_id)).toEqual(["claim-pg"]);
  });

  it("honors explicit graph_target over inference", () => {
    const overrideWriteSet: WriteSet = {
      ...writeset,
      writeset_id: "ws-explicit-target",
      claims: [
        mkClaim({
          claim_id: "claim-override",
          predicate: "believes",
          graph_target: "RG",
          object: { kind: "claim", id: "claim-rg" },
        }),
      ],
    };

    const views = materializeViews([overrideWriteSet]);

    expect(views.RG.edges.map((e) => e.claim_id)).toEqual(["claim-override"]);
    expect(views.BG.edges).toHaveLength(0);
  });
});
