export type DifficultyBand = "easy" | "medium" | "hard";

export interface DifficultySignal {
  score: number; // 0..1
  band: DifficultyBand;
  domain: string;
  recommendedDepth: number;
  reasons: string[];
}

export interface DifficultyEstimator {
  estimate(query: string, context?: { userBudgetUsd?: number }): Promise<DifficultySignal>;
}
