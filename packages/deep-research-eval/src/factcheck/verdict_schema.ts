export type ClaimVerdict = 'Right' | 'Wrong' | 'Unknown';

export interface EvidenceSnippet {
  sourceId: string;
  snippet: string;
  url?: string;
  retrievedAt: string;
  hash: string;
}

export interface ClaimResult {
  claimId: string;
  text: string;
  verdict: ClaimVerdict;
  confidence: number;
  evidence: EvidenceSnippet[];
  contradictions: EvidenceSnippet[];
  notes?: string;
}

export interface FactCheckSummary {
  totalClaims: number;
  checkedClaims: number;
  coverageRatio: number;
  contradictions: number;
}
