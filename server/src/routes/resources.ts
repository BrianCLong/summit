// server/src/routes/resources.ts

import { Router, Request, Response, NextFunction } from 'express';
import { quotaManager, QuotaMap } from '../lib/resources/quota-manager.js';
import { budgetTracker } from '../lib/resources/budget-tracker.js';

const router = Router();

const adminOnly = (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
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

export default router;
