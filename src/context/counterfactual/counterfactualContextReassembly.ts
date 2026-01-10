import { ContextSegment, ModelExecutionRequest, ModelExecutionResponse } from "../types";
import { TrustWeightedContextAssembler } from "../trust/trustWeightedAssembly";

export type CounterfactualMutationType = "remove" | "attenuate" | "reorder" | "isolate";

export interface CounterfactualVariant {
  id: string;
  mutation: CounterfactualMutationType;
  mutatedSegmentId?: string;
  request: ModelExecutionRequest;
}

export interface CCRConfig {
  attenuateFactor?: number;
  maxVariants?: number;
  includeIsolation?: boolean;
}

export class CounterfactualContextReassembler {
  constructor(
    private readonly assembler: TrustWeightedContextAssembler,
    private readonly config: CCRConfig = {}
  ) {}

  buildVariants(request: ModelExecutionRequest): CounterfactualVariant[] {
    const attenuateFactor = this.config.attenuateFactor ?? 0.5;
    const maxVariants = this.config.maxVariants ?? 5;
    const includeIsolation = this.config.includeIsolation ?? true;
    const segments = request.context.segments;

    const variants: CounterfactualVariant[] = [];

    segments.slice(0, maxVariants).forEach((segment, index) => {
      variants.push(this.buildRemovalVariant(request, segment));
      variants.push(this.buildAttenuationVariant(request, segment, attenuateFactor));
      if (includeIsolation) {
        variants.push(this.buildIsolationVariant(request, segment));
      }

      if (index + 1 < segments.length) {
        variants.push(this.buildReorderVariant(request, segment.metadata.id, index + 1));
      }
    });

    return variants;
  }

  private buildRemovalVariant(
    request: ModelExecutionRequest,
    segment: ContextSegment
  ): CounterfactualVariant {
    const remaining = request.context.segments.filter(
      (candidate) => candidate.metadata.id !== segment.metadata.id
    );
    const context = this.assembler.assemble(remaining);
    return {
      id: this.buildVariantId(request, "remove", segment.metadata.id),
      mutation: "remove",
      mutatedSegmentId: segment.metadata.id,
      request: { ...request, context },
    };
  }

  private buildAttenuationVariant(
    request: ModelExecutionRequest,
    segment: ContextSegment,
    factor: number
  ): CounterfactualVariant {
    const attenuated = request.context.segments.map((candidate) =>
      candidate.metadata.id === segment.metadata.id
        ? {
            ...candidate,
            trustWeight: {
              ...candidate.trustWeight,
              value: candidate.trustWeight.value * factor,
              rationale: `attenuated by CCR factor ${factor}`,
            },
          }
        : candidate
    );
    const context = this.assembler.assemble(attenuated);
    return {
      id: this.buildVariantId(request, "attenuate", segment.metadata.id),
      mutation: "attenuate",
      mutatedSegmentId: segment.metadata.id,
      request: { ...request, context },
    };
  }

  private buildIsolationVariant(
    request: ModelExecutionRequest,
    segment: ContextSegment
  ): CounterfactualVariant {
    const context = this.assembler.assemble([segment]);
    return {
      id: this.buildVariantId(request, "isolate", segment.metadata.id),
      mutation: "isolate",
      mutatedSegmentId: segment.metadata.id,
      request: { ...request, context },
    };
  }

  private buildReorderVariant(
    request: ModelExecutionRequest,
    segmentId: string,
    swapIndex: number
  ): CounterfactualVariant {
    const copy = [...request.context.segments];
    const currentIndex = copy.findIndex((candidate) => candidate.metadata.id === segmentId);
    if (currentIndex === -1 || swapIndex >= copy.length) {
      return {
        id: this.buildVariantId(request, "reorder", segmentId, "noop"),
        mutation: "reorder",
        mutatedSegmentId: segmentId,
        request,
      };
    }

    const [segment] = copy.splice(currentIndex, 1);
    copy.splice(swapIndex, 0, segment);
    const context = this.assembler.assemble(copy);

    return {
      id: this.buildVariantId(request, "reorder", segmentId, `to-${swapIndex}`),
      mutation: "reorder",
      mutatedSegmentId: segmentId,
      request: { ...request, context },
    };
  }

  analyzeResponses(
    baseResponse: ModelExecutionResponse,
    variantResponses: ModelExecutionResponse[]
  ): Array<{ variantId: string; divergence: number }> {
    return variantResponses.map((response) => ({
      variantId: response.requestId,
      divergence: this.computeDivergence(baseResponse.output, response.output),
    }));
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

  private buildVariantId(
    request: ModelExecutionRequest,
    mutation: CounterfactualMutationType,
    segmentId: string,
    suffix?: string
  ): string {
    const trimmed = segmentId.replace(/\s+/g, "-");
    const suffixSegment = suffix ? `-${suffix}` : "";
    return `${request.context.id}-${mutation}-${trimmed}${suffixSegment}`;
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
