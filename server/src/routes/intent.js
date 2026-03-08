"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const IntentClassificationService_js_1 = require("../services/IntentClassificationService.js");
const IntentRouterService_js_1 = require("../services/IntentRouterService.js");
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
const logger_js_1 = require("../utils/logger.js");
const router = express_1.default.Router();
let intentRouterService;
function initializeServices() {
    if (!intentRouterService) {
        const neo4jDriver = (0, database_js_1.getNeo4jDriver)();
        const redisClient = (0, database_js_1.getRedisClient)();
        const pool = (0, database_js_1.getPostgresPool)().pool;
        const embeddingService = new EmbeddingService_js_1.default();
        const llmService = new LLMService_js_1.LLMService();
        const graphRAGService = new GraphRAGService_js_1.GraphRAGService(neo4jDriver, llmService, embeddingService, redisClient);
        const glassBoxService = new GlassBoxRunService_js_1.GlassBoxRunService(pool, redisClient);
        const modelAdapter = new LLMServiceAdapter_js_1.LLMServiceAdapter(llmService);
        const nlToCypherService = new nl_to_cypher_service_js_1.NlToCypherService(modelAdapter);
        const queryPreviewService = new QueryPreviewService_js_1.QueryPreviewService(pool, neo4jDriver, nlToCypherService, glassBoxService, redisClient);
        const graphRAGQueryService = new GraphRAGQueryService_js_1.GraphRAGQueryService(graphRAGService, queryPreviewService, glassBoxService, pool, neo4jDriver);
        const classificationService = new IntentClassificationService_js_1.IntentClassificationService();
        intentRouterService = new IntentRouterService_js_1.IntentRouterService(classificationService, graphRAGQueryService);
    }
}
router.post('/query', auth_js_1.ensureAuthenticated, async (req, res) => {
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
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Intent routing failed');
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
