import {
  AssembledContext,
  ContextSegment,
  ModelExecutionRequest,
  ModelExecutionResponse,
} from "../types";
import { TrustWeightedContextAssembler } from "../trust/trustWeightedAssembly";

export type CounterfactualMutationType = "remove" | "attenuate" | "reorder";

export interface CounterfactualVariant {
  id: string;
  mutation: CounterfactualMutationType;
  mutatedSegmentId?: string;
  request: ModelExecutionRequest;
}

export interface CCRConfig {
  attenuateFactor?: number;
  maxVariants?: number;
}

export class CounterfactualContextReassembler {
  constructor(
    private readonly assembler: TrustWeightedContextAssembler,
    private readonly config: CCRConfig = {}
  ) {}

  buildVariants(request: ModelExecutionRequest): CounterfactualVariant[] {
    const attenuateFactor = this.config.attenuateFactor ?? 0.5;
    const maxVariants = this.config.maxVariants ?? 5;
    const segments = request.context.segments;

    const variants: CounterfactualVariant[] = [];

    segments.slice(0, maxVariants).forEach((segment, index) => {
      variants.push(this.buildRemovalVariant(request, segment));
      variants.push(this.buildAttenuationVariant(request, segment, attenuateFactor));

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
      id: `${request.context.id}-remove-${segment.metadata.id}`,
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
      id: `${request.context.id}-attenuate-${segment.metadata.id}`,
      mutation: "attenuate",
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
        id: `${request.context.id}-noop-${segmentId}`,
        mutation: "reorder",
        mutatedSegmentId: segmentId,
        request,
      };
    }

    const [segment] = copy.splice(currentIndex, 1);
    copy.splice(swapIndex, 0, segment);
    const context = this.assembler.assemble(copy);

    return {
      id: `${request.context.id}-reorder-${segmentId}-to-${swapIndex}`,
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
    if (typeof baseOutput === "string" && typeof variantOutput === "string") {
      return baseOutput === variantOutput ? 0 : 1;
    }
    return JSON.stringify(baseOutput) === JSON.stringify(variantOutput) ? 0 : 1;
  }
}
