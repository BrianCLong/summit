"use strict";
/**
 * Citizen AI REST API
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
exports.createApp = createApp;
exports.startServer = startServer;
const express_1 = __importStar(require("express"));
const conversational_ai_1 = require("./conversational-ai");
const nlu_service_1 = require("./nlu-service");
const metrics_1 = require("./metrics");
const cache_1 = require("./cache");
exports.router = (0, express_1.Router)();
// Request timing middleware
const timingMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const latency = Date.now() - start;
        const success = res.statusCode < 400;
        metrics_1.metrics.recordRequest(success, latency);
    });
    next();
};
// Health check - basic
exports.router.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'citizen-ai',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// Health check - detailed
exports.router.get('/health/detailed', async (_req, res) => {
    const health = await (0, metrics_1.runHealthChecks)();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
});
// Readiness probe
exports.router.get('/health/ready', (_req, res) => {
    res.json({ ready: true });
});
// Liveness probe
exports.router.get('/health/live', (_req, res) => {
    res.json({ alive: true });
});
// Metrics endpoint
exports.router.get('/metrics', (_req, res) => {
    const cacheStats = cache_1.translationCache.getStats();
    const snapshot = metrics_1.metrics.getSnapshot(cacheStats);
    res.json(snapshot);
});
/**
 * POST /api/conversation
 * Process a conversation message
 */
exports.router.post('/conversation', async (req, res) => {
    const start = Date.now();
    try {
        const { sessionId, message, language = 'en' } = req.body;
        if (!sessionId || !message) {
            res.status(400).json({ error: 'sessionId and message are required' });
            return;
        }
        const response = await conversational_ai_1.conversationalAI.processMessage(sessionId, message, language);
        metrics_1.metrics.recordConversation(true, Date.now() - start);
        res.json({
            success: true,
            response,
        });
    }
    catch (error) {
        metrics_1.metrics.recordConversation(false, Date.now() - start);
        res.status(500).json({ error: 'Failed to process message', details: String(error) });
    }
});
/**
 * GET /api/conversation/:sessionId/history
 * Get conversation history
 */
exports.router.get('/conversation/:sessionId/history', (req, res) => {
    const { sessionId } = req.params;
    const history = conversational_ai_1.conversationalAI.getHistory(sessionId);
    res.json({ sessionId, history });
});
/**
 * DELETE /api/conversation/:sessionId
 * Clear conversation session
 */
exports.router.delete('/conversation/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    conversational_ai_1.conversationalAI.clearSession(sessionId);
    res.json({ success: true, message: 'Session cleared' });
});
/**
 * PUT /api/conversation/:sessionId/language
 * Set preferred language for session
 */
exports.router.put('/conversation/:sessionId/language', (req, res) => {
    const { sessionId } = req.params;
    const { language } = req.body;
    if (!language) {
        res.status(400).json({ error: 'language is required' });
        return;
    }
    conversational_ai_1.conversationalAI.setPreferredLanguage(sessionId, language);
    res.json({ success: true, sessionId, language });
});
/**
 * GET /api/services
 * Get available service categories
 */
exports.router.get('/services', (_req, res) => {
    const services = conversational_ai_1.conversationalAI.getServiceCategories();
    res.json({ services });
});
/**
 * POST /api/nlu/analyze
 * Perform NLU analysis on text
 */
exports.router.post('/nlu/analyze', async (req, res) => {
    const start = Date.now();
    try {
        const { text } = req.body;
        if (!text) {
            res.status(400).json({ error: 'text is required' });
            return;
        }
        const analysis = await nlu_service_1.nluService.analyze(text);
        metrics_1.metrics.recordNLU(true, Date.now() - start);
        res.json({ success: true, analysis });
    }
    catch (error) {
        metrics_1.metrics.recordNLU(false, Date.now() - start);
        res.status(500).json({ error: 'NLU analysis failed', details: String(error) });
    }
});
/**
 * POST /api/nlu/detect-language
 * Detect language of text
 */
exports.router.post('/nlu/detect-language', (req, res) => {
    const { text } = req.body;
    if (!text) {
        res.status(400).json({ error: 'text is required' });
        return;
    }
    const detection = nlu_service_1.nluService.detectLanguage(text);
    res.json({ success: true, detection });
});
/**
 * POST /api/nlu/extract-entities
 * Extract entities from text
 */
exports.router.post('/nlu/extract-entities', (req, res) => {
    const { text, language = 'en' } = req.body;
    if (!text) {
        res.status(400).json({ error: 'text is required' });
        return;
    }
    const entities = nlu_service_1.nluService.extractEntities(text, language);
    res.json({ success: true, entities });
});
/**
 * POST /api/nlu/classify-intent
 * Classify user intent
 */
exports.router.post('/nlu/classify-intent', (req, res) => {
    const { text, language = 'en' } = req.body;
    if (!text) {
        res.status(400).json({ error: 'text is required' });
        return;
    }
    const intent = nlu_service_1.nluService.classifyIntent(text, language);
    res.json({ success: true, intent });
});
/**
 * POST /api/nlu/sentiment
 * Analyze sentiment of text
 */
exports.router.post('/nlu/sentiment', (req, res) => {
    const { text, language = 'en' } = req.body;
    if (!text) {
        res.status(400).json({ error: 'text is required' });
        return;
    }
    const sentiment = nlu_service_1.nluService.analyzeSentiment(text, language);
    res.json({ success: true, sentiment });
});
/**
 * Create Express app
 */
function createApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(timingMiddleware);
    // CORS headers for public access
    app.use((_req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    });
    // Routes
    app.use('/api', exports.router);
    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({ error: 'Not found' });
    });
    // Error handler
    app.use((err, _req, res, _next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });
    return app;
}
/**
 * Start server
 */
function startServer(port = 3020) {
    const app = createApp();
    app.listen(port, () => {
        console.log(`Citizen AI Service running on port ${port}`);
    });
}
