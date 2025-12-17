import express from 'express';
import PricingEngine from '../services/PricingEngine.js';

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

export default router;
