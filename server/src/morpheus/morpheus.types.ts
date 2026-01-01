// server/src/morpheus/morpheus.types.ts

/**
 * Represents a dream infiltration.
 */
export interface DreamInfiltration {
  infiltrationId: string;
  targetId: string;
  objective: string;
}

/**
 * Represents an infiltration result.
 */
export interface InfiltrationResult {
  resultId: string;
  targetId: string;
  objective: string;
  status: 'success' | 'failure';
}
