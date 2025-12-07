import { BasePipelineStage, PipelineContext } from '../pipeline.js';
import { Entity, Document } from '../../data-model/types.js';
import crypto from 'crypto';

export interface NormalizationConfig {
  entityType?: string;
  fieldMap?: Record<string, string>;
}

export class NormalizationStage extends BasePipelineStage {
  name = 'normalization';

  constructor(private config: NormalizationConfig) {
    super();
  }

  async process(ctx: PipelineContext, records: any[]): Promise<any[]> {
    ctx.logger.info(`Normalizing ${records.length} records`);

    return records.map(record => {
      // Basic logic: if it looks like a doc, make it a doc. Else entity.
      // In a real system, we'd use the pipeline config/schema to determine this.

      const isDoc = record.text || record.content || this.config.entityType === 'document';

      if (isDoc) {
        return this.normalizeToDocument(ctx, record);
      } else {
        return this.normalizeToEntity(ctx, record);
      }
    });
  }

  private normalizeToDocument(ctx: PipelineContext, record: any): Document {
    return {
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      source: {
        system: ctx.pipeline.source.type,
        id: record.id || record.filename || crypto.randomUUID(),
        uri: record.url || record.path,
      },
      text: record.text || record.content || '',
      title: record.title || record.filename,
      metadata: { ...record, _normalized: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private normalizeToEntity(ctx: PipelineContext, record: any): Entity {
     return {
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      kind: (this.config.entityType as any) || 'custom',
      externalRefs: [{ system: ctx.pipeline.source.type, id: record.id || crypto.randomUUID() }],
      labels: [],
      properties: { ...record },
      sourceIds: [ctx.pipeline.key],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
