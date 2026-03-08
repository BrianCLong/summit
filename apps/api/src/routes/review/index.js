"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewRouter = createReviewRouter;
const express_1 = __importDefault(require("express"));
const security_js_1 = require("../../middleware/security.js");
function parseArrayParam(value) {
    if (!value)
        return undefined;
    const values = Array.isArray(value) ? value : value.split(',');
    return values.map((v) => v.trim()).filter(Boolean);
}
function createReviewRouter({ queue, rbacManager }) {
    const router = express_1.default.Router();
    router.get('/queue', (0, security_js_1.requirePermission)(rbacManager, 'review', 'read'), (req, res) => {
        const types = parseArrayParam(req.query.type);
        const statuses = parseArrayParam(req.query.status);
        const sort = req.query.sort ?? 'createdAt:asc';
        const cursor = req.query.cursor;
        const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : undefined;
        const { items, nextCursor } = queue.list({ types, statuses, sort, cursor, limit });
        res.json({ items, nextCursor });
    });
    router.get('/item/:id', (0, security_js_1.requirePermission)(rbacManager, 'review', 'read'), (req, res) => {
        const item = queue.getById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'item_not_found' });
        }
        return res.json(item);
    });
    router.post('/item/:id/decision', (0, security_js_1.requirePermission)(rbacManager, 'review', 'decide'), (req, res) => {
        const correlationId = req.header('x-correlation-id');
        const { action, reasonCode, note } = req.body;
        if (!correlationId) {
            return res.status(400).json({ error: 'correlation_id_required' });
        }
        if (!action || !reasonCode) {
            return res.status(400).json({ error: 'decision_payload_invalid' });
        }
        try {
            const { decision, idempotent } = queue.decide(req.params.id, {
                action,
                reasonCode,
                note,
                correlationId,
                decidedAt: new Date().toISOString(),
            });
            return res.status(idempotent ? 200 : 201).json({ decision, idempotent });
        }
        catch (error) {
            if (error instanceof Error && error.message === 'item_not_found') {
                return res.status(404).json({ error: 'item_not_found' });
            }
            if (error instanceof Error && error.message === 'decision_already_recorded') {
                return res.status(409).json({ error: 'decision_already_recorded' });
            }
            if (error instanceof Error && error.message.startsWith('action_not_allowed')) {
                return res.status(400).json({ error: error.message });
            }
            if (error instanceof Error && error.message === 'reason_required') {
                return res.status(400).json({ error: 'reason_required' });
            }
            return res.status(500).json({ error: 'decision_failed' });
        }
    });
    return router;
}
