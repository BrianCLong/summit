export type EvidenceId = `EVD-${string}-${string}-${string}`;

export interface EvidenceIndexEntry {
  id: EvidenceId;
  area: string;
  files: string[];
  description: string;
}

export interface EvidenceIndex {
  item: {
    slug: string; // e.g. composer15
    source: string; // URL
  };
  entries: EvidenceIndexEntry[];
}

export interface EvidenceReport {
  run_id: string; // deterministic: caller supplies (e.g. commit SHA)
  summary: string;
  findings: Array<{ id: EvidenceId; severity: "low" | "med" | "high"; note: string }>;
}

export interface EvidenceMetrics {
  counters: Record<string, number>;
  timings_ms?: Record<string, number>;
}

export interface EvidenceStamp {
  created_at_iso: string; // only place timestamps live
  tool_versions: Record<string, string>;
}
