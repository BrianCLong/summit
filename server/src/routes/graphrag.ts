/**
 * GraphRAG REST API Routes
 * RESTful endpoints for GraphRAG operations
 */

import express, { Request, Response } from 'express';
import { GraphRAGQueryService } from '../services/GraphRAGQueryService.js';
import { GraphRAGService } from '../services/GraphRAGService.js';
import { QueryPreviewService } from '../services/QueryPreviewService.js';
import { GlassBoxRunService } from '../services/GlassBoxRunService.js';
import { NlToCypherService } from '../ai/nl-to-cypher/nl-to-cypher.service.js';
import EmbeddingService from '../services/EmbeddingService.js';
import { LLMService } from '../services/LLMService.js';
import { LLMServiceAdapter } from '../ai/nl-to-cypher/LLMServiceAdapter.js';

import { getNeo4jDriver, getPostgresPool, getRedisClient } from '../config/database.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { createRateLimiter, EndpointClass } from '../middleware/rateLimit.js';
import { validateRequest } from '../middleware/validation.js';

const graphRagRateLimiter = createRateLimiter(EndpointClass.QUERY);
import { logger } from '../utils/logger.js';
import { AuthenticatedRequest } from './types.js';

const router = express.Router();

// Initialize services lazily
let graphRAGQueryService: GraphRAGQueryService;

function initializeServices() {
  if (!graphRAGQueryService) {
    const neo4jDriver = getNeo4jDriver();
    const redisClient = getRedisClient();
    const pool = getPostgresPool().pool; // ManagedPostgresPool has a .pool property

    const embeddingService = new EmbeddingService();
    const llmService = new LLMService();

    const graphRAGService = new GraphRAGService(
      neo4jDriver,
      llmService as any,
      embeddingService,
      redisClient
    );

    const glassBoxService = new GlassBoxRunService(pool, redisClient);

    const modelAdapter = new LLMServiceAdapter(llmService);
    const nlToCypherService = new NlToCypherService(modelAdapter);

    const queryPreviewService = new QueryPreviewService(
      pool,
      neo4jDriver,
      nlToCypherService,
      glassBoxService,
      redisClient
    );

    graphRAGQueryService = new GraphRAGQueryService(
      graphRAGService,
      queryPreviewService,
      glassBoxService,
      pool,
      neo4jDriver
    );
  }
}

// Apply authentication and rate limiting
router.use(ensureAuthenticated);
router.use(graphRagRateLimiter);

// Validation schema for new query endpoint
const querySchema = {
  query: { type: 'string', required: false }, // Optional because it might be 'question'
  question: { type: 'string', required: false },
  investigationId: { type: 'string', required: true },
  // ... other fields are optional or handled dynamically
};

const handleQuery = async (req: AuthenticatedRequest, res: Response) => {
  initializeServices();

  try {
    const body = req.body;
    let requestPayload;

    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      logger.warn({ user: req.user }, 'Missing user context for GraphRAG query');
      return res.status(401).json({ error: 'Unauthorized: Missing user context' });
    }

    // Detect legacy request (GraphRAGService style)
    if (body.context || body.maxResults || body.depth || body.model) {
      requestPayload = {
        question: body.query || body.question,
        investigationId: body.investigationId,
        tenantId,
        userId,
        // Map legacy fields
        maxHops: body.depth || body.maxHops || 2,
        focusEntityIds: body.focusEntityIds,
        // Legacy "options" often passed, so we ignore or map what we can
        generateQueryPreview: false, // Legacy assumes direct execution
        autoExecute: true
      };
    } else {
      // New schema
      requestPayload = {
        question: body.query || body.question,
        investigationId: body.investigationId,
        tenantId,
        userId,
        focusEntityIds: body.focusEntityIds,
        maxHops: body.maxHops,
        generateQueryPreview: body.generatePreview,
        autoExecute: body.autoExecute ?? true,
      };
    }

    if (!requestPayload.question || !requestPayload.investigationId) {
      return res.status(400).json({ error: 'Missing required fields: query/question, investigationId' });
    }

    const result = await graphRAGQueryService.query(requestPayload);

    res.json(result);
  } catch (error: any) {
    logger.error({ error, body: req.body }, 'GraphRAG query failed');
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/graphrag/query
 * Execute a natural language query against the graph + docs
 */
router.post('/query', validateRequest(querySchema), handleQuery);

/**
 * POST /api/graphrag/answer
 * Legacy endpoint alias for backward compatibility
 */
router.post('/answer', validateRequest(querySchema), handleQuery);


/**
 * POST /api/graphrag/preview/execute
 * Execute a previously generated preview
 */
router.post('/preview/execute', async (req: AuthenticatedRequest, res: Response) => {
  initializeServices();

  try {
    const { previewId, useEditedQuery, dryRun } = req.body;

    if (!previewId) {
      return res.status(400).json({ error: 'Missing previewId' });
    }

    const result = await graphRAGQueryService.executePreview({
      previewId,
      userId: req.user?.id || 'unknown',
      useEditedQuery,
      dryRun
    });

    res.json(result);
  } catch (error: any) {
    logger.error({ error, body: req.body }, 'Preview execution failed');
    res.status(500).json({ error: error.message });
  }
});

export default router;
