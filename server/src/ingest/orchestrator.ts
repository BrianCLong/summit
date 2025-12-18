import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { PipelineConfig } from '../data-model/types.js';
import { PipelineContext } from './pipeline.js';
import { SourceConnector } from '../connectors/types.js';
import { NormalizationStage } from './stages/normalization.js';
import { EnrichmentStage } from './stages/enrichment.js';
import { IndexingStage } from './stages/indexing.js';
import { FileSourceConnector } from '../connectors/file.js';
import { HttpSourceConnector } from '../connectors/http.js';
import { InMemoryStateStore } from '../connectors/base.js';

export class PipelineOrchestrator {
  constructor(private logger: Logger) {}

  async runPipeline(pipeline: PipelineConfig) {
    const runId = uuidv4();
    this.logger.info({ pipeline: pipeline.key, runId }, 'Starting pipeline run');

    // 1. Resolve Connector
    let connector: SourceConnector;
    if (pipeline.source.type === 'file') {
      connector = new FileSourceConnector(pipeline.source.config);
    } else if (pipeline.source.type === 'api') {
      connector = new HttpSourceConnector(pipeline.source.config);
    } else {
      throw new Error(`Unknown source type: ${pipeline.source.type}`);
    }

    // 2. Setup Context
    const ctx: PipelineContext = {
      pipeline,
      runId,
      tenantId: pipeline.tenantId,
      logger: this.logger.child({ runId, pipeline: pipeline.key }),
    };

    // 3. Build Stages
    const stages = [];
    if (pipeline.stages.includes('normalize')) {
      stages.push(new NormalizationStage(pipeline.options?.normalization || {}));
    }
    if (pipeline.stages.includes('enrich')) {
      stages.push(new EnrichmentStage());
    }
    if (pipeline.stages.includes('index')) {
      stages.push(new IndexingStage());
    }

    // 4. Execution Loop
    // Use a simple in-memory store for this run
    const stateStore = new InMemoryStateStore();

    // In a real system, we'd load the previous cursor from DB
    // await stateStore.setCursor(await db.getCursor(pipeline.key));

    const connectorCtx = {
        tenantId: ctx.tenantId,
        pipelineKey: pipeline.key,
        logger: ctx.logger,
        stateStore
    };

    let hasMore = true;
    while (hasMore) {
      const cursor = await stateStore.getCursor();
      const batch = await connector.fetchBatch(connectorCtx, cursor);

      if (batch.records.length === 0) {
        hasMore = false;
        break;
      }

      let currentBatch = batch.records;

      for (const stage of stages) {
        try {
          currentBatch = await stage.process(ctx, currentBatch);
        } catch (err) {
            ctx.logger.error({ err, stage: stage.name }, 'Stage failed');
            // Logic to send to DLQ would go here
            throw err;
        }
      }

      if (batch.nextCursor) {
        await stateStore.setCursor(batch.nextCursor);
      } else {
        hasMore = false;
      }
    }

    this.logger.info({ pipeline: pipeline.key, runId }, 'Pipeline run completed');
  }
}
