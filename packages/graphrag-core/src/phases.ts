/**
 * GraphRAG Phase definitions
 */
export enum Phase {
  /**
   * High-recall graph expansion to generate candidate hypotheses/explanations.
   */
  DISCOVERY = 'DISCOVERY',

  /**
   * Strict, minimal Cypher "evidence APIs" that return proof-grade subgraphs only.
   */
  JUSTIFICATION = 'JUSTIFICATION',
}

export interface PhaseConfig {
  phase: Phase;
  budget: {
    maxHops?: number;
    maxRows?: number;
    timeoutMs: number;
  };
}
