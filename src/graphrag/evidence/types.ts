export type EvidenceClassification = "PUBLIC" | "INTERNAL" | "RESTRICTED";

export interface EvidenceReport {
  evidence_id: string;
  classification: EvidenceClassification;
  summary: string;
  notes?: string[];
}

export interface EvidenceMetrics {
  evidence_id: string;
  metrics: Record<string, number | string | boolean>;
}

export interface EvidenceStamp {
  evidence_id: string;
  generated_at: string;
}

export interface EvidenceBundleItem {
  evidence_id: string;
  path: string;
}

export interface EvidenceIndex {
  version: string;
  items: EvidenceBundleItem[];
}

export interface EvidenceEntry {
  report: EvidenceReport;
  metrics: EvidenceMetrics;
  stamp: EvidenceStamp;
}

export interface EvidenceWriterOptions {
  baseDir: string;
  version?: string;
}
