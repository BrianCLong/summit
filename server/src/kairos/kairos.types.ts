// server/src/kairos/kairos.types.ts

/**
 * Represents a temporal manipulation.
 */
export interface TemporalManipulation {
  manipulationId: string;
  targetId: string;
  timeDilationFactor: number;
}

/**
 * Represents a manipulation result.
 */
export interface ManipulationResult {
  resultId: string;
  targetId: string;
  timeDilationFactor: number;
  status: 'success' | 'failure';
}
