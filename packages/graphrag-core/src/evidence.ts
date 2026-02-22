/**
 * Summit GraphRAG Evidence Interface
 *
 * Defines the contract for deterministic evidence IDs used in compliance and audits.
 *
 * @packageDocumentation
 */

export interface Evidence {
  /**
   * Deterministic Evidence ID
   * Format: EVID-{hash}
   */
  id: `EVID-${string}`;

  /**
   * The path of nodes/relationships traversed to generate this evidence.
   */
  path: string[];

  /**
   * The source of the evidence (e.g., 'Neo4j', 'VectorStore').
   */
  source: string;

  /**
   * Confidence score (0.0 - 1.0)
   */
  confidence?: number;
}

export interface EvidenceBundle {
    evidence: Evidence[];
    meta: {
        timestamp: string;
        queryId: string;
    }
}
