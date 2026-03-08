"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const tickets_js_1 = require("../db/repositories/tickets.js"); // added links
const router = express_1.default.Router();
function timingSafeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length)
        return false;
    return crypto_1.default.timingSafeEqual(ab, bb);
}
// GitHub webhook receiver
router.post('/webhooks/github', express_1.default.json({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.header('x-hub-signature-256') || '';
        const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
        if (!secret) {
            logger_js_1.default.warn('GITHUB_WEBHOOK_SECRET not set; rejecting');
            return res.status(503).json({ error: 'webhook not configured' });
        }
        const body = JSON.stringify(req.body);
        const hmac = crypto_1.default
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');
        const expected = `sha256=${hmac}`;
        if (!timingSafeEqual(signature, expected)) {
            return res.status(401).json({ error: 'invalid signature' });
        }
        const event = req.header('x-github-event') || 'unknown';
        const delivery = req.header('x-github-delivery') || crypto_1.default.randomUUID();
        logger_js_1.default.info({ event, delivery }, 'github webhook received');
        const mapped = (0, tickets_js_1.mapGitHubIssue)(req.body);
        if (mapped) {
            await (0, tickets_js_1.upsertTickets)([mapped]);
        }
        return res.json({ ok: true, upserted: mapped ? 1 : 0 });
    }
    catch (e) {
        logger_js_1.default.error({ err: e }, 'github webhook error');
        return res.status(500).json({ error: 'internal' });
    }
});
// Jira webhook receiver (optional verification by secret header if configured)
router.post('/webhooks/jira', express_1.default.json({ type: 'application/json' }), async (req, res) => {
    try {
        // Optionally verify via custom header if you set one in Jira (X-Jira-Secret)
        const configured = process.env.JIRA_WEBHOOK_SECRET;
        if (configured) {
            const provided = req.header('x-jira-secret') || '';
            if (!timingSafeEqual(provided, configured)) {
                return res.status(401).json({ error: 'invalid secret' });
            }
        }
        logger_js_1.default.info({ webhook: 'jira', type: req.body?.webhookEvent }, 'jira webhook received');
        const mapped = (0, tickets_js_1.mapJiraIssue)(req.body);
        if (mapped) {
            await (0, tickets_js_1.upsertTickets)([mapped]);
        }
        return res.json({ ok: true, upserted: mapped ? 1 : 0 });
    }
    catch (e) {
        logger_js_1.default.error({ err: e }, 'jira webhook error');
        return res.status(500).json({ error: 'internal' });
    }
});
// Minimal tickets endpoint (placeholder for GH/Jira merged view)
router.get('/tickets', async (req, res) => {
    try {
        const limit = Number(req.query.limit || 50);
        const offset = Number(req.query.offset || 0);
        const filters = {
            provider: req.query.provider || undefined,
            assignee: req.query.assignee || undefined,
            label: req.query.label || undefined,
            project: req.query.project || undefined,
            repo: req.query.repo || undefined,
        };
        const items = await (0, tickets_js_1.listTickets)(limit, offset, filters);
        return res.json({ items, total: items.length, limit, offset });
    }
    catch (e) {
        return res.status(500).json({ error: 'internal' });
    }
});
exports.default = router;
