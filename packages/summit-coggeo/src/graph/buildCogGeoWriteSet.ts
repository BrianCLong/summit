import type { CogGeoWriteSet } from "../api/types";

export function buildCogGeoWriteSet(
  writes: CogGeoWriteSet["writes"],
  evidenceRefs: string[]
): CogGeoWriteSet {
  return {
    id: `coggeo-writeset:${Date.now()}`,
    created_at: new Date().toISOString(),
    producer: "summit-coggeo",
    writes,
    evidence_refs: evidenceRefs,
  };
}
