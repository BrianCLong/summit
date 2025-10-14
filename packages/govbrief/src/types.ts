export interface ArticleSection {
  id: string;
  title: string;
  text: string;
  startLine: number;
}

export interface ArticleRecord {
  url: string;
  archiveUrl?: string;
  publisher: string;
  title: string;
  datePublished: string;
  authors: string[];
  sections: ArticleSection[];
}

export type ConfidenceValue = 'low' | 'medium' | 'high';

export interface ClaimEvidence {
  snippet: string;
  section: string;
  anchor: string;
  url: string;
  contentHash: string;
}

export interface ClaimConfidence {
  value: ConfidenceValue;
  rationale: string;
}

export interface ClaimRecord {
  claimId: string;
  text: string;
  salience: number;
  ideologyTags: string[];
  evidence: ClaimEvidence;
  confidence: ClaimConfidence;
  assumptions: string[];
}

export interface ProvenanceRecord {
  retrievedAt: string;
  sourceUrl: string;
  archiveUrl?: string;
  sha256: string;
  toolVersions: Record<string, string>;
}

export type SafetySeverity = 'low' | 'medium' | 'high';

export interface SafetyFlag {
  severity: SafetySeverity;
  message: string;
}

export interface SafetyReview {
  flags: SafetyFlag[];
  notes: string;
  checkedAt: string;
}

export interface FetchResult {
  html: string;
  usedUrl: string;
  archiveUrl?: string;
  retrievedAt: string;
}
