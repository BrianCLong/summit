// @ts-nocheck
import express, { Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { agentControlPlane } from '../maestro/control-plane.js';
import { agentROITracker } from '../maestro/roi-tracker.js';
import { RequestContext } from '../middleware/context-binding.js';
import type { AuthenticatedRequest } from './types.js';

const router = express.Router();

const MetricRecordSchema = z.object({
  metricType: z.string(),
  value: z.number(),
  context: z.record(z.any()).optional(),
});

// Control Plane Dashboard: Get Agent Health
router.get('/dashboard/:agentId', ensureAuthenticated, requirePermission('agent:read'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const health = await agentControlPlane.getAgentHealth(req.params.agentId);
        res.json(health);
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Failed to fetch agent health', details: errorMessage });
    }
});

// Verify Action (used by CI/CD pipelines to gate actions)
router.post('/verify/:agentId', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { action, context } = req.body;
        const result = await agentControlPlane.verifyAgentAction(req.params.agentId, action, context || {});
        if (result.allowed) {
            res.json({ allowed: true });
        } else {
            res.status(403).json(result);
        }
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Verification failed', details: errorMessage });
    }
});

// ROI: Record a "Win" or Metric
router.post('/roi/:agentId', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const data = MetricRecordSchema.parse(req.body);
        const metric = await agentROITracker.recordMetric(req.params.agentId, data.metricType, data.value, data.context);
        res.status(201).json(metric);
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Failed to record ROI metric', details: errorMessage });
    }
});

// ROI: Executive Dashboard (Aggregated)
router.get('/roi/aggregate', ensureAuthenticated, requirePermission('roi:read'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = (req.context as RequestContext).tenantId;
        const totals = await agentROITracker.getAggregatedROI(tenantId);
        res.json({ totals });
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Failed to fetch ROI aggregates', details: errorMessage });
    }
});

export default router;
