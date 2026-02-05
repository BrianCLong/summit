export type PlatformId = 'maltego' | 'shadowdragon' | 'i2' | '1trace' | 'unknown';

export interface SourceSpec {
  id: string;
  platform: PlatformId;
  name: string;
  url: string;
  rationale: string;
}

export interface SourceDocument {
  source: SourceSpec;
  fetched_at: string;
  content_type: string;
  raw: string;
}

export interface EvidenceItem {
  id: string;
  platform: PlatformId;
  source_url: string;
  title: string;
  content_hash: string;
  summary: string;
  tags: string[];
}

export interface ClaimItem {
  id: string;
  text: string;
  platform: PlatformId;
  evidence_refs: string[];
}

export interface PlatformSummary {
  id: string;
  name: string;
  status: string;
  evidence_refs: string[];
}

export interface DriftReason {
  claim_id: string;
  evidence_id: string;
  explanation: string;
}

export interface DriftResult {
  detected: boolean;
  reasons: DriftReason[];
}

export interface PlatformWatchReport {
  schema_version: 'platform-watch.report.v1';
  evidence_id: string;
  date: string;
  summary: string;
  evidence: EvidenceItem[];
  platforms: PlatformSummary[];
  claims: ClaimItem[];
  drift: DriftResult;
}

export interface PlatformWatchMetrics {
  schema_version: 'platform-watch.metrics.v1';
  date: string;
  counts: {
    sources: number;
    evidence: number;
    platforms: number;
    claims: number;
    drift: number;
  };
}

export interface PlatformWatchStamp {
  schema_version: 'platform-watch.stamp.v1';
  date: string;
  inputs_hash: string;
}

export interface KgNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface KgEdge {
  id: string;
  type: string;
  from: string;
  to: string;
  properties: Record<string, unknown>;
}

export interface PlatformWatchKg {
  schema_version: 'platform-watch.kg.v1';
  nodes: KgNode[];
  edges: KgEdge[];
}
