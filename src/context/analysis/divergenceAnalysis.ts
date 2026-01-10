import { ModelExecutionResponse } from "../types";
import { CounterfactualVariant, CounterfactualMutationType } from "../counterfactual/counterfactualContextReassembly";

export interface DivergenceScore {
  baseRequestId: string;
  variantId: string;
  divergence: number;
  mutation?: CounterfactualMutationType;
  mutatedSegmentId?: string;
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
      mutation: variant.mutation,
      mutatedSegmentId: variant.mutatedSegmentId,
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
    if (typeof baseOutput === "number" && typeof variantOutput === "number") {
      const denom = Math.max(1, Math.abs(baseOutput), Math.abs(variantOutput));
      return Math.abs(baseOutput - variantOutput) / denom;
    }
    if (typeof baseOutput === "string" && typeof variantOutput === "string") {
      return baseOutput === variantOutput ? 0 : 1;
    }
    return stableStringify(baseOutput) === stableStringify(variantOutput) ? 0 : 1;
  }
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",")}}`;
};
