export type EvidenceId = string;

export interface EvidenceRunRef {
  runId: string;
  outDir: string;
}

export interface EvidenceFileRefs {
  report: string;
  metrics: string;
  stamp: string;
}

export interface EvidenceIndexEntry {
  evidenceId: EvidenceId;
  files: EvidenceFileRefs;
}

export interface EvidenceIndex {
  version: number;
  items: EvidenceIndexEntry[];
}
