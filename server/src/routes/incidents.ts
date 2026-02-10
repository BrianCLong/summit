import express from 'express';
import { incidentService } from '../services/IncidentService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.use(ensureAuthenticated);

// List Incidents
router.get('/', async (req, res, next) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }
    const incidents = await incidentService.listIncidents(tenantId);
    res.json(incidents);
  } catch (error) {
    next(error);
  }
});

// Create Incident
router.post('/', async (req, res, next) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id || (req as any).user?.sub;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant and User context required' });
    }

    const { title, description, severity, provenanceChainId, runbookId } = req.body;

    if (!title || !severity) {
      return res.status(400).json({ error: 'Title and severity are required' });
    }

    const incident = await incidentService.createIncident({
      tenantId,
      title,
      description: description || '',
      severity,
      userId,
      provenanceChainId,
      runbookId
    });

    res.status(201).json(incident);
  } catch (error) {
    next(error);
  }
});

// Get Incident Details
router.get('/:id', async (req, res, next) => {
  try {
    const incident = await incidentService.getIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Check tenancy
    const tenantId = (req as any).user?.tenantId;
    if (incident.tenant_id !== tenantId) {
       return res.status(403).json({ error: 'Access denied' });
    }

    const steps = await incidentService.getRunbookSteps(req.params.id);

    res.json({ ...incident, steps });
  } catch (error) {
    next(error);
  }
});

// Execute Runbook Step
router.post('/:id/runbook/step/:stepId/execute', async (req, res, next) => {
  try {
    const { id, stepId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const tenantId = (req as any).user?.tenantId;

    const incident = await incidentService.getIncident(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    if (incident.tenant_id !== tenantId) {
       return res.status(403).json({ error: 'Access denied' });
    }

    const step = await incidentService.executeStep(id, stepId, userId);
    res.json(step);
  } catch (error) {
    next(error);
  }
});

export default router;
