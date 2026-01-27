
import express, { Response } from 'express';
import { AuthenticatedRequest } from './types.js';
import { IntentClassificationService } from '../services/IntentClassificationService.js';
import { IntentRouterService } from '../services/IntentRouterService.js';
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
import { logger } from '../utils/logger.js';

const router = express.Router();

let intentRouterService: IntentRouterService;

function initializeServices() {
    if (!intentRouterService) {
        const neo4jDriver = getNeo4jDriver();
        const redisClient = getRedisClient();
        const pool = getPostgresPool().pool;

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

        const graphRAGQueryService = new GraphRAGQueryService(
            graphRAGService,
            queryPreviewService,
            glassBoxService,
            pool,
            neo4jDriver
        );

        const classificationService = new IntentClassificationService();
        intentRouterService = new IntentRouterService(
            classificationService,
            graphRAGQueryService
        );
    }
}

router.post('/query', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    initializeServices();
    try {
        const { query, context } = req.body;

        if (!query) {
             return res.status(400).json({ error: 'Query is required' });
        }

        const tenantId = req.user?.tenant_id || req.user?.tenantId;
        const userId = req.user?.id || req.user?.sub;

        const effectiveContext = {
            ...context,
            tenantId,
            userId,
            investigationId: context?.investigationId || 'default'
        };

        const result = await intentRouterService.route(query, effectiveContext);
        res.json(result);
    } catch (error: any) {
        logger.error({ error }, 'Intent routing failed');
        res.status(500).json({ error: error.message });
    }
});

export default router;
