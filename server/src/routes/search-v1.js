"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const RetrievalService_js_1 = require("../retrieval/RetrievalService.js");
const RagContextBuilder_js_1 = require("../retrieval/RagContextBuilder.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const pg_js_1 = require("../db/pg.js");
const router = express_1.default.Router();
// Initialize services lazily or via dependency injection in real app.
// Here we'll instantiate for the route.
const retrievalService = new RetrievalService_js_1.RetrievalService(pg_js_1.pool);
const ragBuilder = new RagContextBuilder_js_1.RagContextBuilder(retrievalService);
// POST /api/v1/search/retrieve
router.post('/retrieve', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { query, kind = 'hybrid', filters, topK = 10 } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query text is required' });
        }
        const tenantId = req.user.tenantId; // Assumes middleware populates this
        const result = await retrievalService.search({
            tenantId,
            queryText: query,
            queryKind: kind,
            filters: {
                kinds: filters?.kinds,
                timeRange: filters?.timeRange,
                metadata: filters?.metadata
            },
            topK,
            includeContent: req.body.includeContent ?? false
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error({ error }, 'Search retrieval failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/v1/search/rag-context
router.post('/rag-context', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { query, maxTokens = 2000, retrievalConfig } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query text is required' });
        }
        const tenantId = req.user.tenantId;
        const context = await ragBuilder.buildContext({
            tenantId,
            queryText: query,
            maxTokens,
            retrievalConfig: {
                topK: retrievalConfig?.topK,
                queryKind: retrievalConfig?.queryKind,
                kinds: retrievalConfig?.kinds
            }
        });
        res.json(context);
    }
    catch (error) {
        logger_js_1.default.error({ error }, 'RAG context build failed');
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
