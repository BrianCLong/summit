
export interface EvidenceBundle {
  id: string;
  primaryArtifact: unknown; // The raw capture
  provenance: {
    collectorId: string;
    timestamp: string;
    method: 'api' | 'scrape' | 'archive';
    sourceHash: string; // SHA256 of the artifact content
    signature?: string; // Digital signature of the collector
  };
  corroboration: {
    independentSources: number; // Count of distinct origins confirming this
    crossValidationId?: string; // Link to separate validation run
    status: 'unverified' | 'pending' | 'corroborated' | 'contradicted';
  };
  uncertainty: {
    confidence: number; // 0.0 - 1.0
    lowerBound: number;
    upperBound: number;
    notes: string;
  };
  metadata?: Record<string, unknown>;
}

export interface CorroborationEvent {
  targetEvidenceId: string;
  corroboratingSourceId: string;
  matchScore: number; // 0.0 - 1.0
  timestamp: string;
}
