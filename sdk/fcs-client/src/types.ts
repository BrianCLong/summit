export type StoreKind = 'database' | 'object' | 'search' | 'vector';

export interface CanarySpec {
  scope: string;
  ttlSeconds: number;
  payload: Record<string, unknown>;
  stores: StoreKind[];
  metadata?: Record<string, unknown>;
}

export interface Provenance {
  canaryId: string;
  scope: string;
  ttlSeconds: number;
  seededAt: string;
  expiresAt: string;
  retrievalSignature: string;
  signature: string;
}

export interface CanaryRecord {
  id: string;
  spec: CanarySpec;
  seededAt: string;
  expiresAt: string;
  provenance: Provenance;
}

export interface Detection {
  canaryId: string;
  scope: string;
  store: StoreKind;
  observed: string;
  confidence: number;
  provenance: Provenance;
}

export interface AttributionFinding {
  canaryId: string;
  scope: string;
  stores: StoreKind[];
  confidence: number;
  provenance: Provenance;
}

export interface AttributionReport {
  generatedAt: string;
  findings: AttributionFinding[];
}
