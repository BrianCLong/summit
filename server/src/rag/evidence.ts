import { ProvenanceEntryV2 } from '../provenance/types.js';

/**
 * EVIDENCE CONTRACT STANDARD (ECS)
 * --------------------------------
 * Formalizes the shape of all retrieval outputs to ensure:
 * 1. Determinism
 * 2. Verifiability
 * 3. Shape Invariance
 */

export interface RetrievalManifest {
  queryId: string;
  timestamp: string;
  strategy: 'VECTOR' | 'GRAPH' | 'HYBRID';
  parameters: Record<string, any>;
  sources: string[];
}

export interface GraphEvidence {
  nodes: Array<{
    id: string;
    labels: string[];
    properties: Record<string, any>;
    importance: {
      pageRank?: number;
      community?: number;
    };
  }>;
  relationships: Array<{
    id: string;
    start: string;
    end: string;
    type: string;
    properties: Record<string, any>;
  }>;
  // Hash of the subgraph state to ensure reproducibility
  stateHash: string;
}

export interface RetrievalCitation {
  id: string;
  source: string;
  url?: string;
  timestamp: string;
  confidence: number;
  snippet?: string;
  // Link to specific graph elements that support this citation
  supportingGraphIds?: string[];
}

export interface EvidenceContract {
  // Unique ID for this specific bundle of evidence
  contractId: string;

  // The query that generated this evidence
  manifest: RetrievalManifest;

  // The actual retrieved content
  citations: RetrievalCitation[];

  // Graph-structured evidence (if applicable)
  graphEvidence?: GraphEvidence;

  // Provenance linking this retrieval to the system state
  provenance: ProvenanceEntryV2 | null;

  // Invariance hash: ensure shape matches expected schema version
  schemaVersion: string; // e.g., "1.0.0"
}

export interface EvidenceBundle {
  results: EvidenceContract[];
  metadata: {
    totalTimeMs: number;
    totalTokens?: number;
  };
}
