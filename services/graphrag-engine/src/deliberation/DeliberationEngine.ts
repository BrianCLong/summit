import { CandidateExplanation } from '../types/explanations.js';
import { ProofSubgraph } from '../justification/ProofExtractor.js';
import { RobustnessScorer, RobustnessScore } from './RobustnessScorer.js';

export interface DeliberationResult {
  selectedExplanation: CandidateExplanation;
  selectedProof: ProofSubgraph;
  robustness: RobustnessScore;
  rejectedExplanations: {
    explanation: CandidateExplanation;
    reason: string;
  }[];
}

export class DeliberationEngine {
  static deliberate(
    candidates: { explanation: CandidateExplanation; proof: ProofSubgraph }[]
  ): DeliberationResult {
    if (candidates.length === 0) {
      throw new Error('No candidate explanations to deliberate');
    }

    const scored = candidates.map(c => ({
      ...c,
      robustness: RobustnessScorer.score(c.explanation, c.proof)
    }));

    // Sort by robustness score descending
    scored.sort((a, b) => b.robustness.score - a.robustness.score);

    const winner = scored[0];
    const rejected = scored.slice(1).map(s => ({
      explanation: s.explanation,
      reason: `Lower robustness score: ${s.robustness.score.toFixed(2)} vs ${winner.robustness.score.toFixed(2)}`
    }));

    return {
      selectedExplanation: winner.explanation,
      selectedProof: winner.proof,
      robustness: winner.robustness,
      rejectedExplanations: rejected
    };
  }
}
