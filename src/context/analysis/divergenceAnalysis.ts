import { ModelExecutionResponse } from "../types";
import { CounterfactualVariant } from "../counterfactual/counterfactualContextReassembly";

export interface DivergenceScore {
  baseRequestId: string;
  variantId: string;
  divergence: number;
}

export interface PoisoningIndicator extends DivergenceScore {
  mutatedSegmentId?: string;
}

export class DivergenceAnalyzer {
  constructor(private readonly threshold: number = 0.5) {}

  score(
    baseResponse: ModelExecutionResponse,
    variants: { variant: CounterfactualVariant; response: ModelExecutionResponse }[]
  ): DivergenceScore[] {
    return variants.map(({ variant, response }) => ({
      baseRequestId: baseResponse.requestId,
      variantId: variant.id,
      divergence: this.computeDivergence(baseResponse.output, response.output),
    }));
  }

  detectPoisoning(scores: DivergenceScore[], variants: CounterfactualVariant[]): PoisoningIndicator[] {
    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
    return scores
      .filter((score) => score.divergence >= this.threshold)
      .map((score) => {
        const variant = variantsById.get(score.variantId);
        return {
          ...score,
          mutatedSegmentId: variant?.mutatedSegmentId,
        };
      });
  }

  private computeDivergence(baseOutput: unknown, variantOutput: unknown): number {
    if (typeof baseOutput === "string" && typeof variantOutput === "string") {
      return baseOutput === variantOutput ? 0 : 1;
    }
    return JSON.stringify(baseOutput) === JSON.stringify(variantOutput) ? 0 : 1;
  }
}
