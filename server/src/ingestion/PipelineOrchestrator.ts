// @ts-nocheck
import { PipelineConfig, ConnectorContext } from '../data-model/types';
import { FileConnector } from '../connectors/FileConnector';
import { HttpConnector } from '../connectors/HttpConnector';
import { SourceConnector } from '../connectors/types';
import { NormalizationService } from './NormalizationService';
import { EnrichmentService } from './EnrichmentService';
import { IndexingService } from './IndexingService';
import { ChunkingService } from './ChunkingService';
import { EmbeddingStage } from './EmbeddingStage';
import { DLQService } from './DLQService';
import { ProcessorFactory } from './processors/ProcessorFactory';
import pino from 'pino';

const logger = (pino as any)({ name: 'PipelineOrchestrator' });

export class PipelineOrchestrator {
  private normalizationService: NormalizationService;
  private enrichmentService: EnrichmentService;
  private indexingService: IndexingService;
  private chunkingService: ChunkingService;
  private embeddingStage: EmbeddingStage;
  private dlqService: DLQService;
  private processorFactory: ProcessorFactory;

  constructor() {
    this.normalizationService = new NormalizationService();
    this.enrichmentService = new EnrichmentService();
    this.indexingService = new IndexingService();
    this.chunkingService = new ChunkingService();
    this.embeddingStage = new EmbeddingStage();
    this.dlqService = new DLQService();
    this.processorFactory = new ProcessorFactory();
  }

  async runPipeline(config: PipelineConfig): Promise<void> {
    logger.info({ pipeline: config.key }, 'Starting pipeline run');

    const ctx: ConnectorContext = {
      tenantId: config.tenantId,
      pipelineKey: config.key,
      logger,
      correlationId: `run-${Date.now()}`
    };

    try {
      // 1. Initialize Source
      const source = this.getConnector(config);

      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        // 2. Fetch Batch (RAW)
        let rawRecords: any[] = [];
        try {
          const batch = await source.fetchBatch(ctx, cursor);
          rawRecords = batch.records;

          if (!batch.nextCursor || batch.nextCursor === 'DONE') {
            hasMore = false;
          } else {
            cursor = batch.nextCursor;
          }
        } catch (e: any) {
           await this.dlqService.recordFailure(ctx, 'RAW', e.message, { cursor });
           break; // Abort if source fails
        }

        if (rawRecords.length === 0) continue;

        logger.info({ count: rawRecords.length, stage: 'RAW' }, 'Fetched records');

        // SPECIAL HANDLING FOR FILE CONNECTOR TO USE PROCESSORS
        let processedDocuments: any[] = [];
        if (config.source.type === 'file') {
            for (const record of rawRecords) {
                // Determine processor based on path
                if (record.path) {
                    const processor = this.processorFactory.getProcessor(record.path);

                    // Prepare content: prefer raw buffer 'content', else buffer from 'text'
                    let content: Buffer;
                    if (record.content && Buffer.isBuffer(record.content)) {
                        content = record.content;
                    } else if (typeof record.text === 'string') {
                        content = Buffer.from(record.text, 'utf-8');
                    } else {
                        content = Buffer.from('');
                    }

                    try {
                        const docs = await processor.process(content, { ...record, tenantId: ctx.tenantId });
                        processedDocuments.push(...docs);
                    } catch (e: any) {
                         logger.error({ file: record.path, error: e.message }, 'Failed to process file');
                         await this.dlqService.recordFailure(ctx, 'PROCESS', e.message, { file: record.path });
                    }
                } else {
                    // Fallback for non-file records from file connector (rare)
                     processedDocuments.push({
                        id: `doc-${Date.now()}-${Math.random()}`,
                        tenantId: ctx.tenantId,
                        text: record.text || JSON.stringify(record),
                        metadata: record
                     });
                }
            }
        } else {
             // Default mapping for other sources (API, etc)
             processedDocuments = rawRecords.map(r => ({
                 id: r.id || `doc-${Date.now()}-${Math.random()}`,
                 tenantId: ctx.tenantId,
                 text: typeof r === 'string' ? r : JSON.stringify(r),
                 metadata: r
             }));
        }

        // 3. Normalize
        let normalized = { entities: [], edges: [], documents: processedDocuments };
        if (config.stages.includes('normalize')) {
           try {
             // Merge with existing logic if any
             const res = await this.normalizationService.normalize(rawRecords, ctx);
             normalized.entities.push(...res.entities);
             normalized.edges.push(...res.edges);
             // We keep our processed documents
           } catch (e: any) {
             await this.dlqService.recordFailure(ctx, 'NORMALIZE', e.message, { count: rawRecords.length });
             continue;
           }
        }

        // 4. Enrich
        let enriched = normalized;
        if (config.stages.includes('enrich')) {
           try {
             enriched = await this.enrichmentService.enrich(normalized, ctx);
           } catch (e: any) {
             await this.dlqService.recordFailure(ctx, 'ENRICH', e.message, { count: normalized.documents.length });
             continue;
           }
        }

        // 5. Index (Chunk -> Embed -> Index)
        if (config.stages.includes('index')) {
           try {
             let chunks: any[] = [];

             // Chunking
             for (const doc of enriched.documents) {
               chunks.push(...this.chunkingService.chunkDocument(doc));
             }

             // Embedding (New Stage)
             if (chunks.length > 0) {
                 chunks = await this.embeddingStage.embedChunks(chunks, ctx);
             }

             await this.indexingService.index({ ...enriched, chunks }, ctx);
           } catch (e: any) {
             await this.dlqService.recordFailure(ctx, 'INDEX', e.message, { count: enriched.documents.length });
           }
        }
      }

      logger.info({ pipeline: config.key }, 'Pipeline run completed');

    } catch (error: any) {
      logger.error({ pipeline: config.key, error }, 'Pipeline run failed');
      throw error;
    }
  }

  private getConnector(config: PipelineConfig): SourceConnector {
    switch (config.source.type) {
      case 'file':
        return new FileConnector(config.source.config);
      case 'api':
        return new HttpConnector(config.source.config);
      default:
        throw new Error(`Unsupported source type: ${config.source.type}`);
    }
  }
}
