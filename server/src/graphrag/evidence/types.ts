export type Classification = 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';

export interface Report {
  evidence_id: string;
  classification: Classification;
  summary: string;
  notes?: string[];
}

export interface Metrics {
  evidence_id: string;
  metrics: Record<string, number | string | boolean>;
}

export interface Stamp {
  evidence_id: string;
  generated_at: string;
}

export interface EvidenceItem {
  evidence_id: string;
  path: string;
}

export interface EvidenceIndex {
  version: string;
  items: EvidenceItem[];
}
