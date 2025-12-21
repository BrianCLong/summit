import { PipelineConfig, ConnectorContext } from '../data-model/types';
import { FileConnector } from '../connectors/FileConnector';
import { HttpConnector } from '../connectors/HttpConnector';
import { SourceConnector } from '../connectors/types';
import { NormalizationService } from './NormalizationService';
import { EnrichmentService } from './EnrichmentService';
import { IndexingService } from './IndexingService';
import { ChunkingService } from './ChunkingService';
import { DLQService } from './DLQService';
import pino from 'pino';

const logger = pino({ name: 'PipelineOrchestrator' });

export class PipelineOrchestrator {
  private normalizationService: NormalizationService;
  private enrichmentService: EnrichmentService;
  private indexingService: IndexingService;
  private chunkingService: ChunkingService;
  private dlqService: DLQService;

  constructor() {
    this.normalizationService = new NormalizationService();
    this.enrichmentService = new EnrichmentService();
    this.indexingService = new IndexingService();
    this.chunkingService = new ChunkingService();
    this.dlqService = new DLQService();
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

        // 3. Normalize
        let normalized = { entities: [], edges: [], documents: [] };
        if (config.stages.includes('normalize')) {
           try {
             normalized = await this.normalizationService.normalize(rawRecords, ctx);
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

        // 5. Index (and Chunk)
        if (config.stages.includes('index')) {
           try {
             const chunks: any[] = [];
             for (const doc of enriched.documents) {
               chunks.push(...this.chunkingService.chunkDocument(doc));
             }

             await this.indexingService.index({ ...enriched, chunks }, ctx);
           } catch (e: any) {
             await this.dlqService.recordFailure(ctx, 'INDEX', e.message, { count: enriched.documents.length });
           }
        }
      }

      logger.info({ pipeline: config.key }, 'Pipeline run completed');

    } catch (error) {
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
