import { Router } from 'express';
import { capabilityAssessmentSchema, doctrineSchema } from '@intelgraph/foreign-intelligence';
import { TechintAnalyzer } from '@intelgraph/technical-intelligence';

export const capabilitiesRouter = Router();
const analyzer = new TechintAnalyzer();

// List capability assessments
capabilitiesRouter.get('/', async (req, res) => {
  try {
    const { agencyId, capabilityType, maturityLevel } = req.query;
    // TODO: Query from database
    res.json({ assessments: [], total: 0, filters: { agencyId, capabilityType, maturityLevel } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create capability assessment
capabilitiesRouter.post('/', async (req, res) => {
  try {
    const assessment = capabilityAssessmentSchema.parse({
      ...req.body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: req.body.tenantId || 'default',
    });
    res.status(201).json(assessment);
  } catch (error: any) {
    res.status(400).json({ error: 'Validation failed', details: error.message });
  }
});

// Get capability assessment
capabilitiesRouter.get('/:id', async (req, res) => {
  try {
    // TODO: Query from database
    res.status(404).json({ error: 'Assessment not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List doctrines
capabilitiesRouter.get('/doctrine', async (req, res) => {
  try {
    const { agencyId, category } = req.query;
    // TODO: Query from database
    res.json({ doctrines: [], total: 0, filters: { agencyId, category } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create doctrine record
capabilitiesRouter.post('/doctrine', async (req, res) => {
  try {
    const doctrine = doctrineSchema.parse({
      ...req.body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: req.body.tenantId || 'default',
    });
    res.status(201).json(doctrine);
  } catch (error: any) {
    res.status(400).json({ error: 'Validation failed', details: error.message });
  }
});

// Assess technical capability
capabilitiesRouter.post('/assess', async (req, res) => {
  try {
    const { platforms, technology, sophistication } = req.body;
    const capability = analyzer.assessCapability({ platforms, technology, sophistication });
    res.json({ ...capability, assessedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
