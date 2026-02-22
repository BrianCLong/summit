import { DeliberationResult } from '../deliberation/DeliberationEngine.js';

export interface AnswerPolicy {
  minRobustness: number;
  minEvidenceDiversity: number;
}

export class AnsweringPolicy {
  constructor(private config: AnswerPolicy) {}

  shouldRefuse(result: DeliberationResult): { refuse: boolean; reason?: string } {
    if (result.robustness.score < this.config.minRobustness) {
      return {
        refuse: true,
        reason: `Insufficient robustness: ${result.robustness.score.toFixed(2)} < ${this.config.minRobustness}`
      };
    }

    if (result.robustness.evidenceDiversity < this.config.minEvidenceDiversity) {
      return {
        refuse: true,
        reason: `Insufficient evidence diversity: ${result.robustness.evidenceDiversity} < ${this.config.minEvidenceDiversity}`
      };
    }

    return { refuse: false };
  }
}
