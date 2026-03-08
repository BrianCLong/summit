import express from 'express';
import { persistentUsageRepository } from './persistence.js';
import { quotaManager } from './quotas.js';
import { planService } from '../usage/plans.js';
import { ensureAuthenticated } from '../middleware/auth.js';

import { User } from '../lib/auth.js';

export const meteringRouter = express.Router();

// Middleware to ensure admin access
const ensureAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = req.user as unknown as User;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Check for admin role
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
};

// GET /summary?tenantId=&from=&to=
meteringRouter.get('/summary', ensureAuthenticated, async (req, res) => {
  try {
    const { tenantId, from, to } = req.query;

    const targetTenantId = (tenantId as string) || req.user?.tenantId;

    if (!targetTenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    // Tenant Isolation
    const currentUser = req.user as unknown as User;
    if (currentUser?.tenantId && currentUser.tenantId !== targetTenantId) {
      // Unless admin
      if (currentUser.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    const usage = await persistentUsageRepository.list(
      targetTenantId,
      from as string,
      to as string
    );

    // Also fetch Plan and Effective Limits
    const plan = await planService.getPlanForTenant(targetTenantId);
    const limits = await quotaManager.getEffectiveQuota(targetTenantId);

    res.json({
      plan: {
        id: plan.id,
        name: plan.name,
        limits: plan.limits
      },
      effectiveQuotas: limits,
      usage: usage
    });
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /finops/usage?tenant_id=&from=&to=
meteringRouter.get('/finops/usage', ensureAuthenticated, async (req, res) => {
  try {
    const { tenant_id, from, to } = req.query;
    const targetTenantId = (tenant_id as string) || req.user?.tenantId;

    if (!targetTenantId) {
      return res.status(400).json({ error: 'tenant_id required' });
    }

    // Auth check
    const user = req.user as unknown as User;
    if (user.role !== 'admin' && user.tenantId !== targetTenantId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const usage = await persistentUsageRepository.list(
      targetTenantId,
      from as string,
      to as string,
    );

    res.json({
      tenantId: targetTenantId,
      from,
      to,
      data: usage,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /finops/costs?tenant_id=&from=&to=
meteringRouter.get('/finops/costs', ensureAuthenticated, async (req, res) => {
  try {
    const { tenant_id, from, to } = req.query;
    const targetTenantId = (tenant_id as string) || req.user?.tenantId;

    if (!targetTenantId) {
      return res.status(400).json({ error: 'tenant_id required' });
    }

    // Auth check
    const user = req.user as unknown as User;
    if (user.role !== 'admin' && user.tenantId !== targetTenantId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // In a real system, we'd join usage to pricing.
    // For MVP, we use the BudgetManager spending report if available.
    const { costAwareScheduler } = await import('../conductor/scheduling/cost-aware-scheduler.js');
    const report = await costAwareScheduler.getSpendingReport(targetTenantId);

    res.json({
      tenantId: targetTenantId,
      currency: 'USD',
      totalCost: report.totalSpend,
      breakdown: report.topCostDrivers,
      daily: report.dailyBreakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /quotas (Admin only) - Sets overrides
meteringRouter.post('/quotas', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { tenantId, config } = req.body;

    if (!tenantId || !config) {
      res.status(400).json({ error: 'Missing tenantId or config' });
      return;
    }

    await quotaManager.setQuotaOverride(tenantId, config);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /plans/assign (Admin only)
meteringRouter.post('/plans/assign', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { tenantId, planId } = req.body;

    if (!tenantId || !planId) {
      res.status(400).json({ error: 'Missing tenantId or planId' });
      return;
    }

    await planService.setPlanForTenant(tenantId, planId);
    res.json({ success: true, message: `Plan ${planId} assigned to ${tenantId}` });
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});
