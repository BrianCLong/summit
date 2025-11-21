/**
 * Incident API Routes
 * REST endpoints for incident management
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { IncidentService } from '../services/incidentService';
import { CreateIncidentInput, UpdateIncidentInput, IncidentFilter } from '../models/incident';

export function createIncidentRoutes(db: Pool): Router {
  const router = Router();
  const incidentService = new IncidentService(db);

  // GET /api/companyos/incidents - List incidents
  router.get('/', async (req, res) => {
    try {
      const filter: IncidentFilter = {};
      if (req.query.severity) filter.severity = req.query.severity as any;
      if (req.query.status) filter.status = req.query.status as any;
      if (req.query.commander) filter.commander = req.query.commander as string;
      if (req.query.customerImpact) filter.customerImpact = req.query.customerImpact === 'true';
      if (req.query.fromDate) filter.fromDate = new Date(req.query.fromDate as string);
      if (req.query.toDate) filter.toDate = new Date(req.query.toDate as string);

      const limit = parseInt(req.query.limit as string) || 25;
      const offset = parseInt(req.query.offset as string) || 0;

      const incidents = await incidentService.listIncidents(filter, limit, offset);
      res.json({ incidents, count: incidents.length });
    } catch (error) {
      console.error('Error listing incidents:', error);
      res.status(500).json({ error: 'Failed to list incidents' });
    }
  });

  // GET /api/companyos/incidents/active - Get active incidents
  router.get('/active', async (req, res) => {
    try {
      const incidents = await incidentService.getActiveIncidents();
      res.json({ incidents });
    } catch (error) {
      console.error('Error fetching active incidents:', error);
      res.status(500).json({ error: 'Failed to fetch active incidents' });
    }
  });

  // GET /api/companyos/incidents/:id - Get incident by ID
  router.get('/:id', async (req, res) => {
    try {
      const incident = await incidentService.getIncident(req.params.id);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      res.json({ incident });
    } catch (error) {
      console.error('Error fetching incident:', error);
      res.status(500).json({ error: 'Failed to fetch incident' });
    }
  });

  // POST /api/companyos/incidents - Create incident
  router.post('/', async (req, res) => {
    try {
      const input: CreateIncidentInput = {
        ...req.body,
        createdBy: req.user?.id || 'system', // Assume req.user is set by auth middleware
      };
      const incident = await incidentService.createIncident(input);
      res.status(201).json({ incident });
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ error: 'Failed to create incident' });
    }
  });

  // PATCH /api/companyos/incidents/:id - Update incident
  router.patch('/:id', async (req, res) => {
    try {
      const input: UpdateIncidentInput = req.body;
      const incident = await incidentService.updateIncident(req.params.id, input);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      res.json({ incident });
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ error: 'Failed to update incident' });
    }
  });

  // POST /api/companyos/incidents/:id/acknowledge - Acknowledge incident
  router.post('/:id/acknowledge', async (req, res) => {
    try {
      const acknowledgedBy = req.user?.id || req.body.acknowledgedBy || 'system';
      const incident = await incidentService.acknowledgeIncident(req.params.id, acknowledgedBy);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      res.json({ incident });
    } catch (error) {
      console.error('Error acknowledging incident:', error);
      res.status(500).json({ error: 'Failed to acknowledge incident' });
    }
  });

  // POST /api/companyos/incidents/:id/resolve - Resolve incident
  router.post('/:id/resolve', async (req, res) => {
    try {
      const { rootCause } = req.body;
      const incident = await incidentService.resolveIncident(req.params.id, rootCause);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      res.json({ incident });
    } catch (error) {
      console.error('Error resolving incident:', error);
      res.status(500).json({ error: 'Failed to resolve incident' });
    }
  });

  // POST /api/companyos/incidents/:id/close - Close incident
  router.post('/:id/close', async (req, res) => {
    try {
      const incident = await incidentService.closeIncident(req.params.id);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      res.json({ incident });
    } catch (error) {
      console.error('Error closing incident:', error);
      res.status(500).json({ error: 'Failed to close incident' });
    }
  });

  // POST /api/companyos/incidents/:id/link-github - Link to GitHub issue
  router.post('/:id/link-github', async (req, res) => {
    try {
      const { githubIssueUrl, githubIssueNumber } = req.body;
      if (!githubIssueUrl || !githubIssueNumber) {
        return res.status(400).json({ error: 'Missing githubIssueUrl or githubIssueNumber' });
      }
      const incident = await incidentService.linkToGithub(
        req.params.id,
        githubIssueUrl,
        githubIssueNumber
      );
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      res.json({ incident });
    } catch (error) {
      console.error('Error linking incident to GitHub:', error);
      res.status(500).json({ error: 'Failed to link incident to GitHub' });
    }
  });

  return router;
}
