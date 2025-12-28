// @ts-nocheck
// server/src/routes/resources.ts

import { Router, Request, Response, NextFunction } from 'express';
import { quotaManager, QuotaMap } from '../lib/resources/quota-manager.js';
import { budgetTracker } from '../lib/resources/budget-tracker.js';
import type { AuthenticatedRequest } from './types.js';
import { ResourceAllocationService } from '../services/ResourceAllocationService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();
const resourceService = ResourceAllocationService.getInstance();

const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Forbidden');
    }
};

router.get('/quotas/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const quotas = quotaManager.getTenantQuotas(tenantId);
  if (quotas) {
    res.json(quotas);
  } else {
    res.status(404).send('Not Found');
  }
});

router.post('/quotas/:tenantId', adminOnly, (req, res) => {
  const { tenantId } = req.params;
  const newQuotas = req.body;
  quotaManager.updateTenantQuotas(tenantId, newQuotas);
  res.status(200).send('OK');
});

// A helper function to extract usage from a QuotaMap
const getUsage = (quotaMap: QuotaMap): { [key: string]: number } => {
    return Object.entries(quotaMap).reduce((acc, [resource, quota]) => {
        if (quota) {
            acc[resource] = quota.usage;
        }
        return acc;
    }, {} as { [key: string]: number });
};

router.get('/usage/:tenantId', (req, res) => {
    const { tenantId } = req.params;
    const quotas = quotaManager.getTenantQuotas(tenantId);
    if (quotas) {
        const usageReport = {
            org: getUsage(quotas.org),
            team: quotas.team ? Object.entries(quotas.team).reduce((acc, [teamId, teamQuotas]) => {
                acc[teamId] = getUsage(teamQuotas);
                return acc;
            }, {} as { [key: string]: { [key: string]: number } }) : {},
            user: quotas.user ? Object.entries(quotas.user).reduce((acc, [userId, userQuotas]) => {
                acc[userId] = getUsage(userQuotas);
                return acc;
            }, {} as { [key: string]: { [key: string]: number } }) : {},
        };
        res.json(usageReport);
    } else {
        res.status(404).send('Not Found');
    }
});

router.get('/budget/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const budget = budgetTracker.getBudgetStatus(tenantId);
  if (budget) {
    res.json(budget);
  } else {
    res.status(404).send('Not Found');
  }
});

// --- New Decision Support Routes ---

// Get decision context
router.get('/requests/:id/decision-context', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const context = await resourceService.getQuotaDecisionContext(id);
    if (!context) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(context);
  } catch {
    res.status(500).json({ error: 'Failed to fetch decision context' });
  }
});

// Submit decision
router.post('/requests/:id/decide', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { optionId } = req.body;

    // In real app, get user ID from req.user
    const userId = (req as unknown as { user: { id: string } }).user?.id || 'unknown-user';

    await resourceService.makeDecision(id, optionId, userId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Decision submission failed' });
  }
});

export default router;
