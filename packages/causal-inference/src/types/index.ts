/**
 * Causal Inference Types
 */

export interface TreatmentEffect {
  ate: number; // Average Treatment Effect
  att: number; // Average Treatment Effect on Treated
  confidence: [number, number];
  pValue: number;
}

export interface PropensityScore {
  unitId: string;
  score: number;
  treatment: boolean;
  matched: boolean;
  matchedUnitId?: string;
}

export interface CausalImpact {
  effect: number;
  relativeEffect: number;
  pValue: number;
  pointPredictions: number[];
  cumulative: number;
}
