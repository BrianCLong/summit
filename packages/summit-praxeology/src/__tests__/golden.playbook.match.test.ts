import { describe, it, expect } from "vitest";
import { matchPlaybook } from "../engine/matchPlaybook";

import playbook from "../fixtures/playbook.defensive.example.json" assert { type: "json" };
import evidence from "../fixtures/evidence.sample.json" assert { type: "json" };

describe("PG matcher (non-prescriptive output)", () => {
  it("emits an analytic hypothesis with confidence + gaps, without recommendations", () => {
    const actionSignaturesById = {
      "pg.action.sig.coordinated-posting.v1": {
        id: "pg.action.sig.coordinated-posting.v1",
        label: "Coordinated posting signature",
        indicators: [
          { id: "ind1", signal: "coordinated posting pattern", weight: 0.7, evidenceKinds: ["post", "report"] }
        ],
        provenance: { source: "seed", createdAt: "2026-03-05T00:00:00Z", curator: "summit.seed" }
      },
      "pg.action.sig.cross-platform-amplification.v1": {
        id: "pg.action.sig.cross-platform-amplification.v1",
        label: "Cross-platform amplification signature",
        indicators: [
          { id: "ind2", signal: "cross-platform amplification", weight: 0.3, evidenceKinds: ["report"] }
        ],
        provenance: { source: "seed", createdAt: "2026-03-05T00:00:00Z", curator: "summit.seed" }
      }
    };

    const out = matchPlaybook({ playbook, actionSignaturesById, evidence });

    expect(out.playbookId).toBe(playbook.id);
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.matchedIndicators.length).toBeGreaterThan(0);

    // Hard guarantee: no recommended actions
    expect((out as any).recommendedActions).toBeUndefined();
    expect(out.notes.toLowerCase()).toContain("non-prescriptive");
  });
});
