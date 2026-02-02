import type { DifficultyEstimator, DifficultySignal } from "./types";
import { detectDomain, extractDifficultyFeatures, scoreDifficultyFromFeatures, recommendedDepth } from "./heuristics";

export class HeuristicDifficultyEstimator implements DifficultyEstimator {
  async estimate(query: string, opts?: { contextHint?: string }): Promise<DifficultySignal> {
    const domain = detectDomain(query, opts?.contextHint);
    const features = extractDifficultyFeatures(query);
    const score = scoreDifficultyFromFeatures(features);
    return {
      score,
      domain,
      recommendedDepth: recommendedDepth(score),
      features,
    };
  }
}
