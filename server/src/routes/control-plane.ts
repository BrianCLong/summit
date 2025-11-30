import express from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { agentControlPlane } from '../maestro/control-plane.js';
import { agentROITracker } from '../maestro/roi-tracker.js';
import { RequestContext } from '../middleware/context-binding.js';

const router = express.Router();

const MetricRecordSchema = z.object({
  metricType: z.string(),
  value: z.number(),
  context: z.record(z.any()).optional(),
});

// Control Plane Dashboard: Get Agent Health
router.get('/dashboard/:agentId', ensureAuthenticated, requirePermission('agent:read'), async (req, res) => {
    try {
        const health = await agentControlPlane.getAgentHealth(req.params.agentId);
        res.json(health);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch agent health' });
    }
});

// Verify Action (used by CI/CD pipelines to gate actions)
router.post('/verify/:agentId', ensureAuthenticated, async (req, res) => {
    try {
        const { action, context } = req.body;
        const result = await agentControlPlane.verifyAgentAction(req.params.agentId, action, context || {});
        if (result.allowed) {
            res.json({ allowed: true });
        } else {
            res.status(403).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

// ROI: Record a "Win" or Metric
router.post('/roi/:agentId', ensureAuthenticated, async (req, res) => {
    try {
        const data = MetricRecordSchema.parse(req.body);
        const metric = await agentROITracker.recordMetric(req.params.agentId, data.metricType, data.value, data.context);
        res.status(201).json(metric);
    } catch (error) {
        res.status(500).json({ error: 'Failed to record ROI metric' });
    }
});

// ROI: Executive Dashboard (Aggregated)
router.get('/roi/aggregate', ensureAuthenticated, requirePermission('roi:read'), async (req, res) => {
    try {
        const tenantId = (req.context as RequestContext).tenantId;
        const totals = await agentROITracker.getAggregatedROI(tenantId);
        res.json({ totals });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ROI aggregates' });
    }
});

export default router;
