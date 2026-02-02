import { DifficultyBand, DifficultyEstimator, DifficultySignal } from './difficulty.js';

export class HeuristicDifficultyScorer implements DifficultyEstimator {
  async estimate(query: string, context?: { userBudgetUsd?: number }): Promise<DifficultySignal> {
    const reasons: string[] = [];
    let score = 0.2; // Base score

    // Length heuristic
    if (query.length > 500) {
      score += 0.3;
      reasons.push("Query length > 500 chars");
    } else if (query.length > 200) {
      score += 0.1;
      reasons.push("Query length > 200 chars");
    }

    // Complexity keywords heuristic
    const complexityKeywords = ["compare", "analyze", "evaluate", "design", "architecture", "strategy", "comprehensive"];
    let complexityMatches = 0;
    for (const keyword of complexityKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        complexityMatches++;
      }
    }

    if (complexityMatches > 2) {
      score += 0.3;
      reasons.push(`High complexity: found ${complexityMatches} complexity keywords`);
    } else if (complexityMatches > 0) {
      score += 0.1;
      reasons.push("Found complexity keywords");
    }

    // Code heuristic
    if (query.includes("```") || query.includes("function ") || query.includes("class ")) {
      score += 0.2;
      reasons.push("Contains code snippets");
    }

    // Clamping
    score = Math.min(1, Math.max(0, score));

    // Band mapping
    let band: DifficultyBand = "easy";
    let recommendedDepth = 1;

    if (score > 0.7) {
      band = "hard";
      recommendedDepth = 3;
    } else if (score > 0.4) {
      band = "medium";
      recommendedDepth = 2;
    }

    return {
      score,
      band,
      domain: "general", // Heuristic doesn't detect domain yet
      recommendedDepth,
      reasons
    };
  }
}
