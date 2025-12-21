export interface Evidence {
  id: string;
  hash: string;
  metadata?: Record<string, unknown> | null;
  licenses?: string[];
  lineage?: Record<string, string>;
}

export interface Claim {
  id: string;
  evidenceIds: string[];
  statement: string;
}

export interface Manifest {
  id: string;
  claimId: string;
  merkleRoot: string;
  createdAt: string;
  evidenceHashes: string[];
  licenses: string[];
  lineage: Record<string, string>;
}
