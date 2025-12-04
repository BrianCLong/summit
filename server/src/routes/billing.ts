import express from 'express';
import { billingService } from '../billing/BillingService.js';
import { logger } from '../config/logger.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.use(ensureAuthenticated);

// Trigger daily export manually
router.post('/export/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { date } = req.body; // optional date string

  try {
    const reportDate = date ? new Date(date) : new Date();
    const report = await billingService.generateAndExportReport(tenantId, reportDate);
    res.json({ success: true, report });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to export billing report' });
  }
});

router.get('/reconciliation/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date query param required' });
  }

  try {
    const result = await billingService.reconcile(tenantId, new Date(date as string));
    res.json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to reconcile' });
  }
});

export default router;
