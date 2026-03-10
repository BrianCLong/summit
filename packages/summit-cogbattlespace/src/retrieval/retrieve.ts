import type { CogBattleStorage, LaneIndexedEntity } from "../storage";
import type { RetrievalRequest, RetrievalResponse, RetrievalHit } from "./types";
import { laneAllowed, laneWeight } from "./lanePolicy";

function rerank(hit: LaneIndexedEntity, lanePolicy: RetrievalRequest["lanePolicy"]): number {
  const base = hit.score ?? 0.5;
  const weight = laneWeight(hit.lane, lanePolicy);
  const trust = hit.trustScore ?? 0.5;
  const confidence = hit.confidenceScore ?? 0.5;

  return base * 0.5 + weight * 0.25 + trust * 0.15 + confidence * 0.1;
}

export async function retrieveWithLanePolicy(
  store: CogBattleStorage,
  req: RetrievalRequest
): Promise<RetrievalResponse> {
  const limit = req.limit ?? 20;
  const mode = req.retrievalMode ?? "HYBRID";

  const candidates = await store.searchLaneEntities({
    query: req.query,
    lanePolicy: req.lanePolicy,
    limit: limit * 4
  });

  const filtered = candidates.filter((c) => laneAllowed(c.lane, req.lanePolicy));

  const ranked = filtered
    .map((c) => ({
      id: c.id,
      entityType: c.entityType,
      score: rerank(c, req.lanePolicy),
      payload: c.payload,
      provenance: {
        lane: c.lane,
        trustScore: c.trustScore,
        confidenceScore: c.confidenceScore,
        collector: c.collector,
        attested: c.attested,
        sourceTrustTier: c.sourceTrustTier,
        provenanceStrength: c.provenanceStrength
      }
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    hits: ranked as RetrievalHit[],
    lanePolicy: req.lanePolicy,
    diagnostics: {
      filteredByLane: candidates.length - filtered.length,
      returned: ranked.length,
      mode
    }
  };
}
