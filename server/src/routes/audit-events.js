"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_js_1 = require("../audit/index.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const routeLogger = logger_js_1.default.child({ name: 'AuditEventsRoutes' });
const router = (0, express_1.Router)();
function getTenantId(req) {
    return String(req.headers['x-tenant-id'] || req.headers['x-tenant'] || '') || null;
}
function parseList(value) {
    if (!value)
        return undefined;
    const raw = Array.isArray(value) ? value.join(',') : value;
    const list = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    return list.length > 0 ? list : undefined;
}
router.get('/audit-events', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        const query = {
            startTime: req.query.startTime
                ? new Date(req.query.startTime)
                : undefined,
            endTime: req.query.endTime
                ? new Date(req.query.endTime)
                : undefined,
            eventTypes: parseList(req.query.eventTypes),
            levels: parseList(req.query.levels),
            userIds: parseList(req.query.userIds),
            resourceTypes: parseList(req.query.resourceTypes),
            correlationIds: parseList(req.query.correlationIds),
            tenantIds: [tenantId],
            limit: req.query.limit ? Number(req.query.limit) : 100,
            offset: req.query.offset ? Number(req.query.offset) : 0,
        };
        const events = await index_js_1.advancedAuditSystem.queryEvents(query);
        routeLogger.info({ tenantId, returnedCount: events.length }, 'Audit events retrieved');
        res.json({
            tenantId,
            returnedCount: events.length,
            offset: query.offset,
            limit: query.limit,
            events,
        });
    }
    catch (error) {
        routeLogger.error({ error: error.message }, 'Failed to query audit events');
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
