/**
 * Evidence system primitives for INFOWAR subsumption.
 */

export type EvidenceIndexEntry = {
  evidence_id: string; // e.g., EVD-INFOWAR-NARR-001
  files: string[];
};

export type EvidenceIndex = {
  version: "1.0";
  item_slug: "INFOWAR";
  entries: EvidenceIndexEntry[];
};

/**
 * Builds a deterministic Evidence Index from a list of entries.
 * Entries are sorted by evidence_id for stability.
 */
export function buildEvidenceIndex(entries: EvidenceIndexEntry[]): EvidenceIndex {
  return {
    version: "1.0",
    item_slug: "INFOWAR",
    entries: [...entries].sort((a, b) => a.evidence_id.localeCompare(b.evidence_id)),
  };
}
