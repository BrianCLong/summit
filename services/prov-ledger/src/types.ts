export interface Evidence {
  evidenceId: string;
  source: string;
  hash: string;
  license?: string;
  timestamp: string;
}

export interface Claim {
  claimId: string;
  assertion: string;
  confidence: number;
  evidenceRefs: string[];
  timestamp: string;
}

export interface LedgerEntry {
  id: string;
  type: 'evidence' | 'transform' | 'claim';
  data: Evidence | Claim | Record<string, unknown>;
  previousHash: string | null;
  hash: string;
}

export interface Manifest {
  bundleId: string;
  merkleRoot: string;
  entries: LedgerEntry[];
}
