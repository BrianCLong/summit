import { ModelExecutionResponse } from '../types';
import { CounterfactualVariant } from '../counterfactual/counterfactualContextReassembly';

export interface DivergenceScore {
  baseRequestId: string;
  variantId: string;
  modification: string;
  divergence: number;
}

export interface PoisoningIndicator {
  segmentId: string;
  modification: string;
  divergence: number;
}

export class DivergenceAnalyzer {
  constructor(private readonly threshold: number = 0.25) {}

  scoreResponses(
    base: ModelExecutionResponse,
    variants: Record<string, ModelExecutionResponse>,
    variantMeta: CounterfactualVariant[]
  ): DivergenceScore[] {
    const scores: DivergenceScore[] = [];
    const baseText = String(base.output ?? '');

    variantMeta.forEach((variant) => {
      const response = variants[variant.id];
      if (!response) return;
      const variantText = String(response.output ?? '');
      const divergence = this.computeDivergence(baseText, variantText);
      scores.push({
        baseRequestId: base.requestId,
        variantId: variant.id,
        modification: variant.modification,
        divergence,
      });
    });

    return scores;
  }

  detectPoisoning(scores: DivergenceScore[]): PoisoningIndicator[] {
    return scores
      .filter((score) => score.divergence >= this.threshold)
      .map((score) => ({
        segmentId: this.extractSegmentId(score.modification),
        modification: score.modification,
        divergence: score.divergence,
      }));
  }

  private computeDivergence(base: string, candidate: string): number {
    if (base.length === 0 && candidate.length === 0) {
      return 0;
    }
    const overlap = this.longestCommonSubsequence(base, candidate);
    const maxLength = Math.max(base.length, candidate.length);
    return 1 - overlap / maxLength;
  }

  private longestCommonSubsequence(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
      Array.from({ length: b.length + 1 }, () => 0)
    );

    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[a.length][b.length];
  }

  private extractSegmentId(modification: string): string {
    const [, segmentId] = modification.split(':');
    return segmentId ?? 'unknown';
  }
}
