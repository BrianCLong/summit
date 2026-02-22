import express from 'express';
import type { Pool } from 'pg';
import { QueryPreviewService } from '../services/QueryPreviewService.js';
import { previewStreamHub } from '../services/previewStreamHub.js';
import { getNeo4jDriver, getPostgresPool, getRedisClient } from '../config/database.js';
import { NlToCypherService } from '../ai/nl-to-cypher/nl-to-cypher.service.js';
import { GlassBoxRunService } from '../services/GlassBoxRunService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

let previewService: QueryPreviewService | null = null;

function getPreviewService(): QueryPreviewService {
  if (previewService) {
    return previewService;
  }

  const pool = getPostgresPool() as unknown as Pool;
  const neo4jDriver = getNeo4jDriver();
  const redis = getRedisClient() ?? undefined;

  const nlToCypherService = new NlToCypherService({
    generate: async () => 'MATCH (n) RETURN n LIMIT 10',
  });

  const glassBoxService = new GlassBoxRunService(pool, redis);
  previewService = new QueryPreviewService(
    pool,
    neo4jDriver,
    nlToCypherService,
    glassBoxService,
    redis,
  );

  return previewService;
}

router.get('/query-previews/:id/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const previewId = req.params.id;
  const parsedBatchSize = Number((req.query.batchSize as any) ?? NaN);
  const batchSize = Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? parsedBatchSize : undefined;
  const cursor = typeof (req.query.cursor as any) === 'string' ? (req.query.cursor as any) : null;
  const autoStart = (req.query.autostart as any) !== 'false';
  const useEditedQuery = (req.query.useEdited as any) === 'true';
  const userId = (req as any).user?.id ?? 'stream-subscriber';

  let service: QueryPreviewService;
  try {
    service = getPreviewService();
  } catch (error: any) {
    logger.error({ error }, 'Failed to initialise query preview stream service');
    res.write(`event: error\ndata:${JSON.stringify({ message: 'Unable to initialise streaming service' })}\n\n`);
    res.end();
    return;
  }

  const unsubscribe = previewStreamHub.subscribe(previewId, (payload) => {
    res.write(`data:${JSON.stringify(payload)}\n\n`);
    if (payload.complete) {
      res.write('event: complete\n\n');
    }
  });

  req.on('close', () => {
    unsubscribe();
  });

  try {
    const cached = await service.getStreamingPartial(previewId, useEditedQuery);
    if (cached?.rows?.length) {
      res.write(
        `event: warm-start\ndata:${JSON.stringify({
          previewId,
          batch: cached.rows,
          cursor,
          cacheTier: cached.tier,
        })}\n\n`,
      );
    }
  } catch (error: any) {
    logger.warn({ error, previewId }, 'Failed to load streaming cache warm start');
  }

  if (autoStart) {
    void service
      .executePreview({
        previewId,
        userId,
        useEditedQuery,
        cursor,
        batchSize,
        stream: true,
      })
      .catch((error) => {
        logger.error({ error, previewId }, 'Streaming execution failed');
        res.write(
          `event: error\ndata:${JSON.stringify({
            message: error instanceof Error ? error.message : String(error),
          })}\n\n`,
        );
        res.end();
      });
  }
});

export default router;
