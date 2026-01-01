// server/src/chimera/chimera.types.ts

/**
 * Represents a genetic sequence to be analyzed.
 */
export interface GeneticSequence {
  sequenceId: string;
  targetId: string;
  sequence: string;
}

/**
 * Represents a predictive behavioral model.
 */
export interface BehavioralModel {
  modelId: string;
  targetId: string;
  accuracy: number;
  cognitiveBiases: string[];
  personalityTraits: string[];
  generatedAt: Date;
}
