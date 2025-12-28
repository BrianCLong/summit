import express from 'express';
import { trustPortalService } from '../services/TrustPortalService';
import { trustIncidentService } from '../services/TrustIncidentService';
import { ensureAuthenticated } from '../middleware/auth';
import { ensureRole } from '../middleware/rbac';
import { z } from 'zod';

const router = express.Router();

/**
 * @route GET /api/trust/status
 * @desc Get system status
 */
router.get('/status', ensureAuthenticated, async (req, res) => {
  try {
    const status = await trustPortalService.getSystemStatus(req.user!.tenantId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * @route GET /api/trust/slas
 * @desc Get SLA compliance status
 */
router.get('/slas', ensureAuthenticated, async (req, res) => {
  try {
    const slas = await trustPortalService.getSLACompliance(req.user!.tenantId);
    res.json(slas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SLA data' });
  }
});

/**
 * @route GET /api/trust/incidents
 * @desc Get active incidents
 */
router.get('/incidents', ensureAuthenticated, async (req, res) => {
  try {
    const incidents = await trustIncidentService.getActiveIncidents();
    // Filter logic for tenant visibility should be enhanced here
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

/**
 * @route GET /api/trust/incidents/history
 * @desc Get incident history
 */
router.get('/incidents/history', ensureAuthenticated, async (req, res) => {
  try {
    const history = await trustIncidentService.getIncidentHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incident history' });
  }
});

/**
 * @route GET /api/trust/evidence
 * @desc Get recent verifiable evidence
 */
router.get('/evidence', ensureAuthenticated, async (req, res) => {
  try {
    const evidence = await trustPortalService.getRecentEvidence(req.user!.tenantId);
    res.json(evidence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

/**
 * @route GET /api/trust/export
 * @desc Export trust report as PDF
 */
/**
 * @route GET /api/trust/compliance
 * @desc Get compliance posture
 */
router.get('/compliance', ensureAuthenticated, async (req, res) => {
    try {
        const compliance = await trustPortalService.getCompliancePosture(req.user!.tenantId);
        res.json(compliance);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch compliance posture' });
    }
});

router.get('/export', ensureAuthenticated, async (req, res) => {
  try {
    const pdfBuffer = await trustPortalService.exportTrustReport(req.user!.tenantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="trust-report-${req.user!.tenantId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Admin Routes for Incidents (Internal Only)
router.post('/admin/incidents', ensureAuthenticated, ensureRole(['admin', 'support']), async (req, res) => {
    // Validation schema
    const schema = z.object({
        title: z.string(),
        summary: z.string(),
        severity: z.enum(['minor', 'major', 'critical']),
        affectedServices: z.array(z.string()),
        affectedRegions: z.array(z.string()),
        startedAt: z.string().transform(str => new Date(str)),
        status: z.enum(['investigating', 'identified', 'monitoring', 'resolved'])
    });

    try {
        const data = schema.parse(req.body);
        const incident = await trustIncidentService.createIncident(data as any);
        res.status(201).json(incident);
    } catch (error) {
        res.status(400).json({ error: 'Invalid incident data' });
    }
});

router.patch('/admin/incidents/:id', ensureAuthenticated, ensureRole(['admin', 'support']), async (req, res) => {
    const schema = z.object({
        message: z.string(),
        status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional()
    });

    try {
        const data = schema.parse(req.body);
        const incident = await trustIncidentService.updateIncident(req.params.id, data);
        res.json(incident);
    } catch (error) {
        res.status(400).json({ error: 'Invalid update data' });
    }
});

export default router;
