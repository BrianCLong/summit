export type EvidenceIndexEntry = {
  evidence_id: string; // e.g., EVD-INFOWAR-NARR-001
  files: string[];
};

export type EvidenceIndex = {
  version: '1.0';
  item_slug: 'INFOWAR';
  entries: EvidenceIndexEntry[];
};

/**
 * Builds a deterministic evidence index.
 * Enforces stable ordering of entries by evidence_id.
 */
export function buildEvidenceIndex(entries: EvidenceIndexEntry[]): EvidenceIndex {
  const sortedEntries = [...entries].sort((a, b) =>
    a.evidence_id.localeCompare(b.evidence_id)
  );

  return {
    version: '1.0',
    item_slug: 'INFOWAR',
    entries: sortedEntries,
  };
}

export type EvidenceReport = {
  evidence_id: string;
  summary: string;
  details: Record<string, any>;
  timestamp?: string; // Only allowed in stamp.json, but here for type completeness if needed
};

export type EvidenceMetrics = {
  evidence_id: string;
  metrics: Record<string, number>;
};

export type EvidenceStamp = {
  evidence_id: string;
  timestamp: string;
  hash: string;
};
