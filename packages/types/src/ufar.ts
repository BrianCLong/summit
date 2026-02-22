/**
 * Uncertainty-First Analytic Record (UFAR)
 */
export interface UFAR {
  uncertainty: {
    /** Uncertainty arising from lack of knowledge or data. */
    epistemic: number;
    /** Inherent randomness or variability in the system. */
    aleatoric: number;
  };
  /** Specific questions or data points that would reduce epistemic uncertainty. */
  known_unknowns: string[];
  /** Presuppositions made during analysis. */
  assumptions: string[];
  /** Steps to test assumptions or resolve known unknowns. */
  validation_plan: string[];
  /** Optional confidence score, must be accompanied by uncertainty fields. */
  confidence?: number;
}
