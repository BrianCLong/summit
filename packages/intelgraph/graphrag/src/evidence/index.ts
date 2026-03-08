export type EvidenceIndexEntry = {
  evidence_id: string;
  files: string[];
};

export type EvidenceIndex = {
  version: "1.0";
  item_slug: "INFOWAR";
  entries: EvidenceIndexEntry[];
};

export function buildEvidenceIndex(entries: EvidenceIndexEntry[]): EvidenceIndex {
  return { version: "1.0", item_slug: "INFOWAR", entries };
}
