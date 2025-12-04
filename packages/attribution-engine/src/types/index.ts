export interface IdentityCluster {
  id: string;
  identifiers: Set<string>;
  accounts: Array<{ platform: string; username: string }>;
  confidence: number;
}

export interface AttributionEvidence {
  type: string;
  source: string;
  confidence: number;
  data: any;
}
