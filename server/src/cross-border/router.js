"use strict";
/**
 * Cross-Border HTTP Router
 *
 * Express router for cross-border assistant REST API endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.crossBorderRouter = void 0;
const express_1 = require("express");
const gateway_js_1 = require("./gateway.js");
const resilience_js_1 = require("./resilience.js");
const metrics_js_1 = require("./metrics.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
exports.crossBorderRouter = router;
/**
 * Error handler middleware
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * GET /cross-border/health
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const status = gateway.getStatus();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ...status,
    });
});
/**
 * GET /cross-border/status
 * Detailed status endpoint
 */
router.get('/status', (_req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const resilience = (0, resilience_js_1.getResilienceManager)();
    res.json({
        gateway: gateway.getStatus(),
        resilience: resilience.getMetrics(),
        timestamp: new Date().toISOString(),
    });
});
/**
 * GET /cross-border/metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', (_req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const status = gateway.getStatus();
    // Update gauge metrics
    (0, metrics_js_1.updateActiveSessions)(status.activeSessions);
    (0, metrics_js_1.updateActivePartners)(status.activePartners);
    const metrics = (0, metrics_js_1.getCrossBorderMetrics)();
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics.toPrometheus());
});
/**
 * GET /cross-border/partners
 * List all partners
 */
router.get('/partners', (_req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const partners = gateway.getPartners();
    res.json({
        count: partners.length,
        partners: partners.map((p) => ({
            code: p.code,
            name: p.name,
            region: p.region,
            status: p.status,
            languages: p.languages,
            domains: p.capabilities.domains,
            trustLevel: p.trustLevel.level,
        })),
    });
});
/**
 * GET /cross-border/partners/:code
 * Get partner details
 */
router.get('/partners/:code', (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const partnerCode = (0, http_param_js_1.firstString)(req.params.code);
    if (!partnerCode) {
        res.status(400).json({ error: 'Partner code is required' });
        return;
    }
    const partner = gateway.getPartner(partnerCode);
    if (!partner) {
        res.status(404).json({ error: 'Partner not found' });
        return;
    }
    const health = gateway.getPartnerHealth(partnerCode);
    res.json({
        ...partner,
        health,
    });
});
/**
 * GET /cross-border/partners/:code/health
 * Get partner health status
 */
router.get('/partners/:code/health', (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const partnerCode = (0, http_param_js_1.firstString)(req.params.code);
    if (!partnerCode) {
        res.status(400).json({ error: 'Partner code is required' });
        return;
    }
    const health = gateway.getPartnerHealth(partnerCode);
    if (!health) {
        res.status(404).json({ error: 'Partner health not found' });
        return;
    }
    res.json(health);
});
/**
 * POST /cross-border/partners/search
 * Search for partners by criteria
 */
router.post('/partners/search', asyncHandler(async (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const { domain, language, classification, region } = req.body;
    let partners = gateway.getPartners();
    if (domain) {
        partners = gateway.findPartnersByDomain(domain);
    }
    if (language) {
        partners = partners.filter((p) => p.languages.includes(language));
    }
    if (region) {
        partners = partners.filter((p) => p.region === region);
    }
    res.json({
        count: partners.length,
        partners: partners.map((p) => ({
            code: p.code,
            name: p.name,
            region: p.region,
            status: p.status,
            languages: p.languages,
            domains: p.capabilities.domains,
        })),
    });
}));
/**
 * POST /cross-border/sessions
 * Create a new cross-border session
 */
router.post('/sessions', asyncHandler(async (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const { targetNation, intent, language, dataClassification } = req.body;
    if (!targetNation || !intent || !language) {
        res.status(400).json({
            error: 'Missing required fields: targetNation, intent, language',
        });
        return;
    }
    const session = await gateway.createSession({
        targetNation,
        intent,
        language,
        context: dataClassification
            ? { dataClassification: dataClassification }
            : undefined,
    });
    res.status(201).json({
        sessionId: session.id,
        state: session.state,
        originNation: session.originNation,
        targetNation: session.targetNation,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
    });
}));
/**
 * GET /cross-border/sessions
 * List active sessions
 */
router.get('/sessions', (_req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const sessions = gateway.getActiveSessions();
    res.json({
        count: sessions.length,
        sessions: sessions.map((s) => ({
            id: s.id,
            state: s.state,
            originNation: s.originNation,
            targetNation: s.targetNation,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
        })),
    });
});
/**
 * GET /cross-border/sessions/:id
 * Get session details
 */
router.get('/sessions/:id', (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const sessionId = (0, http_param_js_1.firstString)(req.params.id);
    if (!sessionId) {
        res.status(400).json({ error: 'Session id is required' });
        return;
    }
    const session = gateway.getSession(sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.json(session);
});
/**
 * POST /cross-border/sessions/:id/messages
 * Send a message in a session
 */
router.post('/sessions/:id/messages', asyncHandler(async (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const sessionId = (0, http_param_js_1.firstString)(req.params.id);
    const { content, translate, targetLanguage } = req.body;
    if (!sessionId || !content) {
        res.status(400).json({ error: 'Missing required field: content' });
        return;
    }
    const message = await gateway.sendMessage(sessionId, content, {
        translate,
        targetLanguage,
    });
    res.status(201).json(message);
}));
/**
 * GET /cross-border/sessions/:id/messages
 * Get messages for a session
 */
router.get('/sessions/:id/messages', (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const sessionId = (0, http_param_js_1.firstString)(req.params.id);
    if (!sessionId) {
        res.status(400).json({ error: 'Session id is required' });
        return;
    }
    const messages = gateway.getMessages(sessionId);
    res.json({
        count: messages.length,
        messages,
    });
});
/**
 * POST /cross-border/sessions/:id/complete
 * Complete a session
 */
router.post('/sessions/:id/complete', asyncHandler(async (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const sessionId = (0, http_param_js_1.firstString)(req.params.id);
    if (!sessionId) {
        res.status(400).json({ error: 'Session id is required' });
        return;
    }
    await gateway.completeSession(sessionId);
    res.json({ success: true });
}));
/**
 * POST /cross-border/sessions/:id/handover
 * Initiate handover to another partner
 */
router.post('/sessions/:id/handover', asyncHandler(async (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const sessionId = (0, http_param_js_1.firstString)(req.params.id);
    const { targetNation, reason } = req.body;
    if (!sessionId || !targetNation || !reason) {
        res.status(400).json({
            error: 'Missing required fields: targetNation, reason',
        });
        return;
    }
    const response = await gateway.initiateHandover(sessionId, targetNation, reason);
    res.json(response);
}));
/**
 * POST /cross-border/translate
 * Translate text
 */
router.post('/translate', asyncHandler(async (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const { text, targetLanguage, sourceLanguage } = req.body;
    if (!text || !targetLanguage) {
        res.status(400).json({
            error: 'Missing required fields: text, targetLanguage',
        });
        return;
    }
    const translatedText = await gateway.translate(text, targetLanguage, sourceLanguage);
    res.json({
        originalText: text,
        translatedText,
        sourceLanguage: sourceLanguage || 'auto',
        targetLanguage,
    });
}));
/**
 * POST /cross-border/detect-language
 * Detect language of text
 */
router.post('/detect-language', asyncHandler(async (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const { text } = req.body;
    if (!text) {
        res.status(400).json({ error: 'Missing required field: text' });
        return;
    }
    const detection = await gateway.detectLanguage(text);
    res.json(detection);
}));
/**
 * GET /cross-border/languages
 * Get supported languages
 */
router.get('/languages', (_req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const languages = gateway.getSupportedLanguages();
    res.json({
        count: languages.length,
        languages,
    });
});
/**
 * POST /cross-border/handover/accept
 * Accept an incoming handover (called by partner assistants)
 */
router.post('/handover/accept', asyncHandler(async (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const response = await gateway.acceptHandover(req.body);
    res.json(response);
}));
/**
 * GET /cross-border/audit
 * Get audit log
 */
router.get('/audit', (req, res) => {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const { operation, sessionId, since } = req.query;
    const sinceRaw = (0, http_param_js_1.firstString)(since);
    const entries = gateway.getAuditLog({
        operation: (0, http_param_js_1.firstString)(operation),
        sessionId: (0, http_param_js_1.firstString)(sessionId),
        since: sinceRaw ? new Date(sinceRaw) : undefined,
    });
    res.json({
        count: entries.length,
        entries,
    });
});
/**
 * Error handling middleware
 */
router.use((err, _req, res, _next) => {
    console.error('Cross-border error:', err);
    res.status(500).json({
        error: err.message || 'Internal server error',
        code: 'CROSS_BORDER_ERROR',
    });
});
exports.default = router;
