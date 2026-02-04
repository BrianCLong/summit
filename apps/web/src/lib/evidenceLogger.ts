// Item 4: Client-side Evidence Emission
// Logs errors in a format compliant with the Summit Evidence Contract Standard (ECS)

// Replicating ECS types locally to avoid complex cross-package dependencies in this MWS
export interface EvidenceContract {
  contractId: string;
  manifest: {
    queryId: string;
    timestamp: string;
    strategy: 'CLIENT_ERROR';
    parameters: Record<string, any>;
    sources: string[];
  };
  citations: Array<{
    id: string;
    source: string;
    timestamp: string;
    confidence: number;
    snippet?: string;
  }>;
  schemaVersion: string;
}

export const logErrorEvidence = (error: Error, componentStack?: string, context?: Record<string, any>) => {
  const evidence: EvidenceContract = {
    contractId: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    manifest: {
      queryId: 'client-exception',
      timestamp: new Date().toISOString(),
      strategy: 'CLIENT_ERROR',
      parameters: {
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack,
        ...context
      },
      sources: ['client-runtime']
    },
    citations: [], // No retrieval citations for a crash
    schemaVersion: '1.0.0'
  };

  // In a real implementation, this would POST to /api/evidence
  // For MWS, we log to console with a specific prefix for extraction
  console.error('[EVIDENCE_EMISSION]', JSON.stringify(evidence));

  return evidence;
};
