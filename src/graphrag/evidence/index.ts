import type { EvidenceIndex, EvidenceEntry } from "./types.js";

export function buildEvidenceIndex(entries: EvidenceEntry[], version = "1.0.0"): EvidenceIndex {
  const items = entries
    .map((entry) => ({
      evidence_id: entry.report.evidence_id,
      path: `${entry.report.evidence_id}`,
    }))
    .sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));

  return { version, items };
}
