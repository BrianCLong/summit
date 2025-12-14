import { Router } from 'express';
import { pg } from '../db/pg.js';
import { DLQService } from '../ingest/dlq.js';
import { PipelineOrchestrator } from '../ingest/orchestrator.js';
import { KnowledgeFabricRetrievalService } from '../rag/retrieval.js';
import { pino } from 'pino';

const router = Router();
const logger = pino({ name: 'IngestionAPI' });
const dlqService = new DLQService(logger);
const orchestrator = new PipelineOrchestrator(logger);
const retrievalService = new KnowledgeFabricRetrievalService(logger);

// Middleware to ensure tenant context
// In a real app, this is likely already done by auth middleware
const ensureTenant = (req: any, res: any, next: any) => {
  // Mocking tenant for now if not present, but relying on upstream auth usually
  if (!req.user?.tenantId && !req.headers['x-tenant-id']) {
     // Fallback for dev/testing if allowed, else 401
     // req.user = { tenantId: 'default' };
  }
  next();
};

// --- Pipelines ---

router.get('/pipelines', async (req, res) => {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  try {
    const pipelines = await pg.manyOrNone(
      'SELECT * FROM ingestion_pipelines WHERE tenant_id = $1',
      [tenantId]
    );
    res.json(pipelines);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

router.post('/pipelines', async (req, res) => {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  const config = req.body;

  try {
    await pg.none(
      `INSERT INTO ingestion_pipelines (key, tenant_id, name, source_config, stages, options)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET
         name = EXCLUDED.name,
         source_config = EXCLUDED.source_config,
         stages = EXCLUDED.stages,
         options = EXCLUDED.options,
         updated_at = NOW()`,
      [config.key, tenantId, config.name, config.source, config.stages, config.options]
    );
    res.json({ success: true, key: config.key });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to save pipeline' });
  }
});

router.post('/pipelines/:key/run', async (req, res) => {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  const { key } = req.params;

  try {
    const pipeline = await pg.oneOrNone(
      'SELECT * FROM ingestion_pipelines WHERE key = $1 AND tenant_id = $2',
      [key, tenantId]
    );

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // Adapt DB row to PipelineConfig type
    const config = {
      ...pipeline,
      source: pipeline.source_config,
      tenantId
    };

    // Run async (fire and forget for API, but orchestrator handles logging)
    orchestrator.runPipeline(config).catch(err => {
      logger.error({ err, pipeline: key }, 'Pipeline run failed asynchronously');
    });

    res.json({ success: true, message: 'Pipeline run initiated' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to start pipeline run' });
  }
});

// --- DLQ ---

router.get('/dlq', async (req, res) => {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  try {
    const records = await dlqService.getDLQRecords(tenantId as string);
    res.json(records);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to fetch DLQ' });
  }
});

// --- Retrieval / RAG ---

router.post('/search/retrieve', async (req, res) => {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  const { query, limit, filters } = req.body;

  try {
    const results = await retrievalService.search({
      tenantId: tenantId as string,
      queryText: query,
      limit,
      filters
    });
    res.json(results);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Retrieval failed' });
  }
});

export default router;
