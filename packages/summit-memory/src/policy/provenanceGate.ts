import type { WriteSet } from "../types.js";

export interface ProvenanceGateResult {
  allowed: boolean;
  reason: string;
}

export function provenanceGate(writeSet: WriteSet): ProvenanceGateResult {
  if (writeSet.provenanceRefs.length === 0) {
    return { allowed: false, reason: "missing-provenance" };
  }

  const missingSourceIds = writeSet.provenanceRefs.some((p) => !p.sourceId);
  if (missingSourceIds) {
    return { allowed: false, reason: "invalid-provenance-source-id" };
  }

  return { allowed: true, reason: "ok" };
}
