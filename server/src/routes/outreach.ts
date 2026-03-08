import { Router } from 'express';
import { OutreachTracker } from '@intelgraph/outreach';

const router = Router();
const tracker = new OutreachTracker();

/**
 * @route GET /api/outreach/dashboard
 * @desc Returns the Grafana JSON dashboard for outreach performance
 */
router.get('/dashboard', async (req, res) => {
  try {
    const tenant = (req.query.tenant as string) || 'default';
    const dashboardJson = await tracker.dashboard(tenant);
    res.json(dashboardJson);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch outreach dashboard' });
  }
});

/**
 * @route POST /api/outreach/log-open
 * @desc Logs an email open event
 */
router.post('/log-open', async (req, res) => {
  try {
    const { campaignId, email } = req.body;
    if (!campaignId || !email) {
      return res.status(400).json({ error: 'Missing campaignId or email' });
    }
    await tracker.logOpen(campaignId, email);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log outreach event' });
  }
});

export default router;
