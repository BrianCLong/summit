"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const service_js_1 = require("../services/entity-resolution/service.js");
const quality_js_1 = require("../services/entity-resolution/quality.js");
const EntityResolutionV2Service_js_1 = require("../services/er/EntityResolutionV2Service.js");
const database_js_1 = require("../config/database.js");
const router = express_1.default.Router();
const erService = new service_js_1.EntityResolutionService();
const dqService = new quality_js_1.DataQualityService();
const erV2Service = new EntityResolutionV2Service_js_1.EntityResolutionV2Service();
// Batch Resolution Endpoint
router.post('/resolve-batch', async (req, res) => {
    try {
        const { entities } = req.body;
        if (!Array.isArray(entities)) {
            return res.status(400).json({ error: 'Entities must be an array' });
        }
        // Inject tenantId from authenticated user context if not present on entities
        // Assuming req.user is populated by auth middleware
        const tenantId = req.user?.tenantId;
        const enrichedEntities = entities.map(e => ({
            ...e,
            tenantId: e.tenantId || tenantId
        }));
        if (enrichedEntities.some(e => !e.tenantId)) {
            return res.status(400).json({ error: 'Tenant ID missing on some entities' });
        }
        const decisions = await erService.resolveBatch(enrichedEntities);
        res.json({ decisions });
    }
    catch (error) {
        console.error('Batch resolution error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Data Quality Metrics Endpoint
router.get('/quality/metrics', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        const metrics = await dqService.getQualityMetrics(tenantId);
        res.json({ metrics });
    }
    catch (error) {
        console.error('Quality metrics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Guardrail status endpoint
router.get('/guardrails/status', async (req, res) => {
    try {
        const datasetId = typeof req.query.datasetId === 'string' ? req.query.datasetId : undefined;
        const guardrails = erV2Service.evaluateGuardrails(datasetId);
        const pool = (0, database_js_1.getPostgresPool)();
        const overrideResult = await pool.query(`
        SELECT dataset_id, reason, actor_id, merge_id, created_at
        FROM er_guardrail_overrides
        WHERE dataset_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [guardrails.datasetId]);
        const latestOverride = overrideResult.rows[0]
            ? {
                datasetId: overrideResult.rows[0].dataset_id,
                reason: overrideResult.rows[0].reason,
                actorId: overrideResult.rows[0].actor_id,
                mergeId: overrideResult.rows[0].merge_id,
                createdAt: overrideResult.rows[0].created_at,
            }
            : null;
        res.json({
            ...guardrails,
            latestOverride,
        });
    }
    catch (error) {
        console.error('Guardrail status error:', error);
        res.status(500).json({ error: 'Failed to fetch guardrail status' });
    }
});
// Guardrail preflight evaluation (CI/merge gate)
router.post('/guardrails/preflight', async (req, res) => {
    try {
        const datasetId = req.body?.datasetId;
        const guardrails = erV2Service.evaluateGuardrails(datasetId);
        await erV2Service.recordGuardrailEvaluation(guardrails, {
            userId: req.user?.id,
            tenantId: req.user?.tenantId,
        });
        res.json(guardrails);
    }
    catch (error) {
        console.error('Guardrail preflight error:', error);
        res.status(500).json({ error: 'Failed to run guardrail preflight' });
    }
});
exports.default = router;
