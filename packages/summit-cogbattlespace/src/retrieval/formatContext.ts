import type { RetrievalResponse } from "./types";

export function formatRetrievalContext(resp: RetrievalResponse): string {
  const blocks = resp.hits.map((hit, i) => {
    return [
      `[#${i + 1}] ${hit.entityType}`,
      `lane=${hit.provenance.lane}`,
      `score=${hit.score.toFixed(3)}`,
      hit.provenance.trustScore != null ? `trust=${hit.provenance.trustScore.toFixed(2)}` : null,
      hit.provenance.confidenceScore != null
        ? `confidence=${hit.provenance.confidenceScore.toFixed(2)}`
        : null,
      hit.provenance.sourceTrustTier ? `sourceTier=${hit.provenance.sourceTrustTier}` : null,
      hit.provenance.provenanceStrength ? `prov=${hit.provenance.provenanceStrength}` : null,
      hit.provenance.attested != null ? `attested=${String(hit.provenance.attested)}` : null,
      `payload=${JSON.stringify(hit.payload)}`
    ]
      .filter(Boolean)
      .join(" | ");
  });

  return [
    `lanePolicy=${resp.lanePolicy}`,
    resp.diagnostics
      ? `diagnostics={returned:${resp.diagnostics.returned}, filteredByLane:${resp.diagnostics.filteredByLane}, mode:${resp.diagnostics.mode}}`
      : null,
    "",
    ...blocks
  ]
    .filter(Boolean)
    .join("\n");
}
