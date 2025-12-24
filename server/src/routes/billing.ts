import express from 'express';
import PricingEngine from '../services/PricingEngine.js';
import PricingCalculator from '../services/PricingCalculator.js';
import { Plan } from '../types/usage.js';

const router = express.Router();

/**
 * GET /api/v1/billing/invoices
 * List invoices for the tenant.
 */
router.get('/invoices', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || !user.tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    // In a real app, we'd query the invoices table.
    // Since I implemented generation but not a direct list query in PricingEngine (yet),
    // I will mock or implement a direct DB query here.
    // For MVP, let's assume PricingEngine.generateInvoice logic persists it, so we can query `invoices` table.

    // Quick DB query:
    const { getPostgresPool } = await import('../config/database.js');
    const pool = getPostgresPool();
    const result = await pool.query(
        `SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY period_start DESC`,
        [user.tenantId]
    );

    res.json(result.rows);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

/**
 * POST /api/v1/billing/invoices/generate
 * Trigger invoice generation (mostly for testing/admin).
 */
router.post('/invoices/generate', async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || !user.tenantId) {
             res.status(401).json({ error: 'Unauthorized' });
             return;
        }

        // Generate for current month so far
        const start = new Date();
        start.setDate(1);
        start.setHours(0,0,0,0);
        const end = new Date();

        const invoice = await PricingEngine.generateInvoice(
            user.tenantId,
            start.toISOString(),
            end.toISOString()
        );

        res.json(invoice);
    } catch (e: any) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});

/**
 * POST /api/v1/billing/calculator
 * Calculate estimated cost for a given usage profile.
 * Body: { planId?: string, usage: Record<string, number> }
 * If planId is omitted, uses the tenant's current plan.
 */
router.post('/calculator', async (req, res) => {
    try {
        const user = (req as any).user;
        const { planId, usage } = req.body;

        if (!usage) {
            res.status(400).json({ error: 'usage object is required' });
            return;
        }

        let plan: Plan;

        if (planId) {
            const fetchedPlan = await PricingEngine.getPlanById(planId);
            if (!fetchedPlan) {
                res.status(404).json({ error: `Plan not found: ${planId}` });
                return;
            }
            plan = fetchedPlan;
        } else if (user && user.tenantId) {
             const result = await PricingEngine.getEffectivePlan(user.tenantId);
             plan = result.plan;
        } else {
             // Default public plan if no user - fetch 'free' plan from DB
             const publicPlan = await PricingEngine.getPlanById('free');
             if (!publicPlan) {
                 res.status(404).json({ error: 'Default plan configuration not found' });
                 return;
             }
             plan = publicPlan;
        }

        // Validate usage values
        for (const [key, val] of Object.entries(usage)) {
            if (typeof val !== 'number') {
                res.status(400).json({ error: `Invalid quantity for metric '${key}'. Must be a number.` });
                return;
            }
        }

        const estimate = PricingCalculator.calculateEstimate(plan, usage as Record<string, number>);
        res.json(estimate);

    } catch (e: any) {
        // Log the full error internally
        console.error('Billing calculator error:', e);
        // Return generic error to client
        res.status(500).json({ error: 'Internal server error processing pricing estimate' });
    }
});

export default router;
