
export interface EvidenceScore {
  totalScore: number; // 0-100
  breakdown: {
    sourceReliability: number;
    provenanceCompleteness: number;
    recency: number;
    corroboration: number;
  };
  reasons: string[];
  missingFields: string[];
}

export interface EvidenceItem {
  id: string;
  sourceType: string; // 'official', 'osint', 'rumor'
  hasDigitalSignature: boolean;
  timestamp: Date;
  corroborationCount: number;
  [key: string]: any;
}
