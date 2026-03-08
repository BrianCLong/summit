"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const pubsub_js_1 = require("../realtime/pubsub.js");
const node_crypto_1 = require("node:crypto");
const logger_js_1 = require("../utils/logger.js");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const router = (0, express_1.Router)();
const webhookRateLimit = (0, rateLimit_js_1.createRouteRateLimitMiddleware)('webhookIngest');
function verifySignature(body, sig) {
    const secret = process.env.ML_WEBHOOK_SECRET;
    if (!secret) {
        logger_js_1.logger.error('ML_WEBHOOK_SECRET is not configured');
        return false;
    }
    if (!body) {
        return false;
    }
    const h = crypto_1.default.createHmac('sha256', secret).update(body).digest('hex');
    const digestBuffer = Buffer.from(h);
    const sigBuffer = Buffer.from(sig || '');
    try {
        if (digestBuffer.length !== sigBuffer.length) {
            return false;
        }
        return crypto_1.default.timingSafeEqual(digestBuffer, sigBuffer);
    }
    catch (error) {
        return false;
    }
}
router.post('/ai/webhook', webhookRateLimit, async (req, res) => {
    const sig = req.header('X-IntelGraph-Signature') || '';
    // Sentinel: CRITICAL Fix - Do not fallback to JSON.stringify(req.body)
    // JSON serialization is non-deterministic and can be manipulated to bypass signature checks.
    // We must rely on the raw buffer captured by the express.json() verify hook.
    const raw = req.rawBody;
    if (!raw) {
        logger_js_1.logger.error('Webhook received without rawBody. Ensure express.json() is configured with verify hook.');
        return res.status(500).json({ error: 'System configuration error' });
    }
    if (!verifySignature(raw, sig)) {
        logger_js_1.logger.warn('Invalid webhook signature attempt');
        return res.status(401).json({ error: 'Invalid signature' });
    }
    const evt = req.body; // Body is already parsed by express.json()
    const { job_id, kind } = evt;
    const db = req.db;
    // Ideally db should be typed, but for now we assume it's injected middleware
    if (!db) {
        logger_js_1.logger.error('Database connection missing in request context');
        return res.status(500).json({ error: 'Database unavailable' });
    }
    try {
        await db.jobs.update(job_id, {
            status: 'SUCCESS',
            finishedAt: new Date().toISOString(),
        });
        const insights = normalizeInsights(evt);
        for (const payload of insights) {
            const ins = await db.insights.insert({
                id: (0, node_crypto_1.randomUUID)(),
                jobId: job_id,
                kind,
                payload,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            });
            pubsub_js_1.pubsub.publish(`INSIGHT_PENDING_${kind || '*'}`, ins);
        }
        pubsub_js_1.pubsub.publish(`AI_JOB_${job_id}`, { id: job_id, kind, status: 'SUCCESS' });
        await db.audit.insert({
            id: (0, node_crypto_1.randomUUID)(),
            type: 'ML_WEBHOOK',
            actorId: 'ml-service',
            createdAt: new Date().toISOString(),
            meta: { jobId: job_id, kind, count: insights.length },
        });
        res.json({ ok: true });
    }
    catch (error) {
        logger_js_1.logger.error('Error processing AI webhook', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
function normalizeInsights(evt) {
    if (evt.kind === 'nlp_entities')
        return evt.results;
    if (evt.kind === 'entity_resolution')
        return evt.links;
    if (evt.kind === 'link_prediction')
        return evt.predictions;
    if (evt.kind === 'community_detect')
        return evt.communities;
    return [evt];
}
exports.default = router;
