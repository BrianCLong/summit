import { Router } from 'express';
import {
  intelligenceAgencySchema,
  IntelligenceAgency,
} from '@intelgraph/espionage-tracking';
import {
  AgencyTracker,
  organizationalUnitSchema,
  leadershipProfileSchema,
  operationalPrioritySchema,
} from '@intelgraph/foreign-intelligence';

export const agenciesRouter = Router();
const tracker = new AgencyTracker();

// List agencies
agenciesRouter.get('/', async (req, res) => {
  try {
    const { country, agencyType, classification } = req.query;
    // TODO: Query from database
    res.json({ agencies: [], total: 0, filters: { country, agencyType, classification } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get agency
agenciesRouter.get('/:id', async (req, res) => {
  try {
    // TODO: Query from database
    res.status(404).json({ error: 'Agency not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create agency
agenciesRouter.post('/', async (req, res) => {
  try {
    const agency = tracker.createAgencyProfile({
      ...req.body,
      tenantId: req.body.tenantId || 'default',
    });
    res.status(201).json(agency);
  } catch (error: any) {
    res.status(400).json({ error: 'Validation failed', details: error.message });
  }
});

// Get agency assessment
agenciesRouter.get('/:id/assessment', async (req, res) => {
  try {
    // TODO: Fetch agency from database
    const agency: any = null;
    if (!agency) return res.status(404).json({ error: 'Agency not found' });

    const assessment = tracker.getAgencyAssessment(agency);
    res.json(assessment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Organizational units
agenciesRouter.get('/:id/units', async (req, res) => {
  try {
    // TODO: Query organizational units
    res.json({ units: [], total: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

agenciesRouter.post('/:id/units', async (req, res) => {
  try {
    const { id } = req.params;
    const units = tracker.mapOrganizationalStructure(id, [req.body]);
    res.status(201).json(units[0]);
  } catch (error: any) {
    res.status(400).json({ error: 'Validation failed', details: error.message });
  }
});

// Leadership profiles
agenciesRouter.get('/:id/leadership', async (req, res) => {
  try {
    // TODO: Query leadership profiles
    res.json({ leaders: [], total: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

agenciesRouter.post('/:id/leadership', async (req, res) => {
  try {
    const profile = leadershipProfileSchema.parse({
      ...req.body,
      id: crypto.randomUUID(),
      agencyId: req.params.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: req.body.tenantId || 'default',
    });
    res.status(201).json(profile);
  } catch (error: any) {
    res.status(400).json({ error: 'Validation failed', details: error.message });
  }
});

// Operational priorities
agenciesRouter.get('/:id/priorities', async (req, res) => {
  try {
    // TODO: Query operational priorities
    res.json({ priorities: [], total: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

agenciesRouter.post('/:id/priorities', async (req, res) => {
  try {
    const priority = operationalPrioritySchema.parse({
      ...req.body,
      id: crypto.randomUUID(),
      agencyId: req.params.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: req.body.tenantId || 'default',
    });
    res.status(201).json(priority);
  } catch (error: any) {
    res.status(400).json({ error: 'Validation failed', details: error.message });
  }
});
