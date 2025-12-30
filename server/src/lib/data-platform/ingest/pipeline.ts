import { DocumentId, TenantId, CollectionId } from '../types.js';

export type PipelineStageName = 'parse' | 'normalize' | 'chunk' | 'embed' | 'store' | 'enrich';

export interface PipelineContext {
  tenantId: TenantId;
  collectionId: CollectionId;
  documentId: DocumentId;
  rawContent?: Buffer;
  text?: string;
  chunks?: Array<{
    text: string;
    position: number;
    embedding?: number[];
    metadata?: Record<string, unknown>;
  }>;
  metadata: Record<string, unknown>;
  startTime: number;
  config: Record<string, unknown>;
}

export interface PipelineStage {
  name: PipelineStageName;
  execute(context: PipelineContext): Promise<PipelineContext>;
}

export class IngestionPipeline {
  private stages: PipelineStage[] = [];

  constructor(stages: PipelineStage[]) {
    this.stages = stages;
  }

  async run(context: PipelineContext): Promise<PipelineContext> {
    let currentContext = context;
    for (const stage of this.stages) {
      currentContext = await stage.execute(currentContext);
    }
    return currentContext;
  }
}
