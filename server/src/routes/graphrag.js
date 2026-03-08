"use strict";
/**
 * GraphRAG REST API Routes
 * RESTful endpoints for GraphRAG operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GraphRAGQueryService_js_1 = require("../services/GraphRAGQueryService.js");
const GraphRAGService_js_1 = require("../services/GraphRAGService.js");
const QueryPreviewService_js_1 = require("../services/QueryPreviewService.js");
const GlassBoxRunService_js_1 = require("../services/GlassBoxRunService.js");
const nl_to_cypher_service_js_1 = require("../ai/nl-to-cypher/nl-to-cypher.service.js");
const EmbeddingService_js_1 = __importDefault(require("../services/EmbeddingService.js"));
const LLMService_js_1 = require("../services/LLMService.js");
const LLMServiceAdapter_js_1 = require("../ai/nl-to-cypher/LLMServiceAdapter.js");
const database_js_1 = require("../config/database.js");
const auth_js_1 = require("../middleware/auth.js");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const validation_js_1 = require("../middleware/validation.js");
const graphRagRateLimiter = (0, rateLimit_js_1.createRateLimiter)(rateLimit_js_1.EndpointClass.QUERY);
const logger_js_1 = require("../utils/logger.js");
const router = express_1.default.Router();
// Initialize services lazily
let graphRAGQueryService;
function initializeServices() {
    if (!graphRAGQueryService) {
        const neo4jDriver = (0, database_js_1.getNeo4jDriver)();
        const redisClient = (0, database_js_1.getRedisClient)();
        const pool = (0, database_js_1.getPostgresPool)().pool; // ManagedPostgresPool has a .pool property
        const embeddingService = new EmbeddingService_js_1.default();
        const llmService = new LLMService_js_1.LLMService();
        const graphRAGService = new GraphRAGService_js_1.GraphRAGService(neo4jDriver, llmService, embeddingService, redisClient);
        const glassBoxService = new GlassBoxRunService_js_1.GlassBoxRunService(pool, redisClient);
        const modelAdapter = new LLMServiceAdapter_js_1.LLMServiceAdapter(llmService);
        const nlToCypherService = new nl_to_cypher_service_js_1.NlToCypherService(modelAdapter);
        const queryPreviewService = new QueryPreviewService_js_1.QueryPreviewService(pool, neo4jDriver, nlToCypherService, glassBoxService, redisClient);
        graphRAGQueryService = new GraphRAGQueryService_js_1.GraphRAGQueryService(graphRAGService, queryPreviewService, glassBoxService, pool, neo4jDriver);
    }
}
// Apply authentication and rate limiting
router.use(auth_js_1.ensureAuthenticated);
router.use(graphRagRateLimiter);
// Validation schema for new query endpoint
const querySchema = {
    query: { type: 'string', required: false }, // Optional because it might be 'question'
    question: { type: 'string', required: false },
    investigationId: { type: 'string', required: true },
    // ... other fields are optional or handled dynamically
};
const handleQuery = async (req, res) => {
    initializeServices();
    try {
        const body = req.body;
        let requestPayload;
        const tenantId = req.user?.tenant_id;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            logger_js_1.logger.warn({ user: req.user }, 'Missing user context for GraphRAG query');
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
        }
        else {
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
    }
    catch (error) {
        logger_js_1.logger.error({ error, body: req.body }, 'GraphRAG query failed');
        res.status(500).json({ error: error.message });
    }
};
/**
 * POST /api/graphrag/query
 * Execute a natural language query against the graph + docs
 */
router.post('/query', (0, validation_js_1.validateRequest)(querySchema), handleQuery);
/**
 * POST /api/graphrag/answer
 * Legacy endpoint alias for backward compatibility
 */
router.post('/answer', (0, validation_js_1.validateRequest)(querySchema), handleQuery);
/**
 * POST /api/graphrag/preview/execute
 * Execute a previously generated preview
 */
router.post('/preview/execute', async (req, res) => {
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
    }
    catch (error) {
        logger_js_1.logger.error({ error, body: req.body }, 'Preview execution failed');
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
