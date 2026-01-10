import { v4 as uuidv4 } from 'uuid';
import {
  AssembledContext,
  ContextSegment,
  ModelExecutionRequest,
  ModelExecutionResponse,
  ModelExecutor,
} from '../types';
import { TrustWeightedContextAssembler } from '../trust/trustWeightedAssembly';

export interface CounterfactualVariant {
  id: string;
  modification: string;
  context: AssembledContext;
}

export interface CCRConfig {
  maxVariants?: number;
  attenuationWeight?: number;
}

export class CounterfactualContextReassembler {
  private readonly attenuationWeight: number;

  constructor(
    private readonly assembler: TrustWeightedContextAssembler,
    private readonly config: CCRConfig = {},
    private readonly executor?: ModelExecutor
  ) {
    const configured = config.attenuationWeight ?? 0.1;
    this.attenuationWeight = Math.max(0, Math.min(1, configured));
  }

  buildBaseContext(id: string, segments: ContextSegment[]): AssembledContext {
    return this.assembler.assemble(id, segments);
  }

  generateVariants(baseId: string, segments: ContextSegment[]): CounterfactualVariant[] {
    const variants: CounterfactualVariant[] = [];
    const limit = this.config.maxVariants ?? segments.length * 2;

    segments.forEach((segment) => {
      const removed = segments.filter(
        (candidate) => candidate.metadata.id !== segment.metadata.id
      );
      variants.push({
        id: uuidv4(),
        modification: `removal:${segment.metadata.id}`,
        context: this.assembler.assemble(
          `${baseId}:remove:${segment.metadata.id}`,
          removed
        ),
      });

      const attenuated = segments.map((candidate) =>
        candidate.metadata.id === segment.metadata.id
          ? {
              ...candidate,
              trustWeight: {
                ...candidate.trustWeight,
                value: candidate.trustWeight.value * this.attenuationWeight,
              },
            }
          : candidate
      );
      variants.push({
        id: uuidv4(),
        modification: `attenuate:${segment.metadata.id}`,
        context: this.assembler.assemble(
          `${baseId}:attenuate:${segment.metadata.id}`,
          attenuated
        ),
      });
    });

    return variants.slice(0, limit);
  }

  async executeAcrossVariants(
    baseRequest: ModelExecutionRequest
  ): Promise<{ base: ModelExecutionResponse; variants: Record<string, ModelExecutionResponse> }> {
    if (!this.executor) {
      throw new Error('No executor provided for CCR execution');
    }

    const base = await this.executor.execute(baseRequest);
    const variants = await this.runVariants(baseRequest);
    return { base, variants };
  }

  async executeWithVariants(
    baseRequest: ModelExecutionRequest
  ): Promise<{
    base: ModelExecutionResponse;
    variants: Record<string, ModelExecutionResponse>;
    variantMeta: CounterfactualVariant[];
  }> {
    if (!this.executor) {
      throw new Error('No executor provided for CCR execution');
    }

    const base = await this.executor.execute(baseRequest);
    const variantMeta = this.generateVariants(
      baseRequest.context.id,
      baseRequest.context.segments
    );
    const variants = await this.runVariants(baseRequest, variantMeta);
    return { base, variants, variantMeta };
  }

  private async runVariants(
    baseRequest: ModelExecutionRequest,
    variantMeta: CounterfactualVariant[] = this.generateVariants(
      baseRequest.context.id,
      baseRequest.context.segments
    )
  ): Promise<Record<string, ModelExecutionResponse>> {
    if (!this.executor) {
      throw new Error('No executor provided for CCR execution');
    }

    const responses: Record<string, ModelExecutionResponse> = {};

    for (const variant of variantMeta) {
      const response = await this.executor.execute({
        ...baseRequest,
        context: variant.context,
        input: baseRequest.input,
      });
      responses[variant.id] = response;
    }

    return responses;
  }
}
