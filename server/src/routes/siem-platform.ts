import { Router } from 'express';
import { siemPlatform } from '../siem/SIEMPlatform.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';

const router = Router();

// Apply auth
router.use(authMiddleware);

// Ingest Event
router.post('/ingest', async (req, res, next) => {
  try {
    const event = await siemPlatform.ingestEvent({
        ...req.body,
        tenantId: req.user?.tenantId || req.body.tenantId,
        source: req.body.source || 'api'
    });
    res.json({ success: true, eventId: event.id });
  } catch (err) {
    next(err);
  }
});

// Get Alerts
router.get('/alerts', (req, res) => {
  const alerts = siemPlatform.getAlerts({});
  res.json({ data: alerts });
});

// Get Events
router.get('/events', (req, res) => {
  const events = siemPlatform.getEvents({});
  res.json({ data: events });
});

// Get Compliance Report (Mock)
router.get('/compliance/report', (req, res) => {
    // Generate a mock report
    const report = {
        generatedAt: new Date(),
        complianceScore: 95,
        violations: [],
        status: 'compliant'
    };
    res.json(report);
});

export default router;
