export type DifficultySignal = {
  /** 0..1 */
  score: number;
  /** best-effort classification */
  domain: string;
  /** suggested workflow depth, e.g. 1..6 */
  recommendedDepth: number;
  /** optional: inspectable features for debugging/telemetry */
  features?: Record<string, number>;
};

export interface DifficultyEstimator {
  estimate(query: string, opts?: { contextHint?: string }): Promise<DifficultySignal>;
}
