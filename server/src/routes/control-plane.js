"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const rbac_js_1 = require("../middleware/rbac.js");
const control_plane_js_1 = require("../maestro/control-plane.js");
const roi_tracker_js_1 = require("../maestro/roi-tracker.js");
const router = express_1.default.Router();
const MetricRecordSchema = zod_1.z.object({
    metricType: zod_1.z.string(),
    value: zod_1.z.number(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
});
// Control Plane Dashboard: Get Agent Health
router.get('/dashboard/:agentId', auth_js_1.ensureAuthenticated, (0, rbac_js_1.requirePermission)('agent:read'), async (req, res) => {
    try {
        const health = await control_plane_js_1.agentControlPlane.getAgentHealth(req.params.agentId);
        res.json(health);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Failed to fetch agent health', details: errorMessage });
    }
});
// Verify Action (used by CI/CD pipelines to gate actions)
router.post('/verify/:agentId', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { action, context } = req.body;
        const result = await control_plane_js_1.agentControlPlane.verifyAgentAction(req.params.agentId, action, context || {});
        if (result.allowed) {
            res.json({ allowed: true });
        }
        else {
            res.status(403).json(result);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Verification failed', details: errorMessage });
    }
});
// ROI: Record a "Win" or Metric
router.post('/roi/:agentId', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const data = MetricRecordSchema.parse(req.body);
        const metric = await roi_tracker_js_1.agentROITracker.recordMetric(req.params.agentId, data.metricType, data.value, data.context);
        res.status(201).json(metric);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Failed to record ROI metric', details: errorMessage });
    }
});
// ROI: Executive Dashboard (Aggregated)
router.get('/roi/aggregate', auth_js_1.ensureAuthenticated, (0, rbac_js_1.requirePermission)('roi:read'), async (req, res) => {
    try {
        const tenantId = req.context.tenantId;
        const totals = await roi_tracker_js_1.agentROITracker.getAggregatedROI(tenantId);
        res.json({ totals });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Failed to fetch ROI aggregates', details: errorMessage });
    }
});
exports.default = router;
