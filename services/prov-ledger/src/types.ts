export interface Evidence {
  evidenceId: string;
  source: string;
  url?: string;
  blob?: string;
  license?: string;
  hash: string;
  timestamp: string;
}

export interface Transform {
  transformId: string;
  inputs: string[];
  tool: string;
  params: Record<string, any>;
  outputs: string[];
  operatorId: string;
  timestamp: string;
}

export interface Claim {
  claimId: string;
  subject: string;
  predicate: string;
  object: string;
  evidenceRefs: string[];
  confidence: number;
  licenseId: string;
  timestamp: string;
}

export interface LedgerEntry {
  id: string;
  type: 'evidence' | 'transform' | 'claim';
  data: Evidence | Transform | Claim;
  previousHash: string | null;
  hash: string; // Hash of (previousHash + type + data)
}

export interface Manifest {
  bundleId: string;
  merkleRoot: string;
  entries: LedgerEntry[];
}
