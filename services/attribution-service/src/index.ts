/**
 * Attribution Service - REST API for attribution and identity resolution
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { AttributionEngine } from '@intelgraph/attribution-engine';
import { IdentityResolver } from '@intelgraph/identity-resolution';
import { FootprintTracker, FootprintAnalyzer } from '@intelgraph/digital-footprint';
import { EntityLinker } from '@intelgraph/entity-linking';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const port = process.env.PORT || 3100;

// Initialize services
const attributionEngine = new AttributionEngine();
const identityResolver = new IdentityResolver({
  matchingThreshold: 0.7,
  autoMergeThreshold: 0.9,
  matchingMethods: ['deterministic', 'probabilistic'],
  fieldWeights: {
    email: 0.9,
    phone: 0.85,
    name: 0.7,
    address: 0.6
  },
  enableMachineLearning: false,
  enableProbabilistic: true
});
const footprintTracker = new FootprintTracker();
const footprintAnalyzer = new FootprintAnalyzer();
const entityLinker = new EntityLinker({
  minConfidence: 0.7,
  maxDistance: 3,
  enableProbabilistic: true,
  enableMLBased: false,
  evidenceWeights: {
    shared_attribute: 0.8,
    co_occurrence: 0.6,
    network_connection: 0.7,
    document_reference: 0.5,
    temporal_correlation: 0.6,
    spatial_proximity: 0.65,
    behavioral_similarity: 0.7
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'attribution-service', timestamp: new Date() });
});

// Attribution endpoints
app.post('/api/v1/attributions', (req: Request, res: Response) => {
  try {
    const { targetEntity, attributedTo, method, evidence } = req.body;
    const attribution = attributionEngine.createAttribution(
      targetEntity,
      attributedTo,
      method,
      evidence
    );
    res.json({ success: true, attribution });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create attribution');
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/attributions/:id', (req: Request, res: Response) => {
  const attribution = attributionEngine.getAttribution(req.params.id);
  if (attribution) {
    res.json({ success: true, attribution });
  } else {
    res.status(404).json({ success: false, error: 'Attribution not found' });
  }
});

app.get('/api/v1/attributions/target/:entity', (req: Request, res: Response) => {
  const attributions = attributionEngine.findByTargetEntity(req.params.entity);
  res.json({ success: true, attributions });
});

app.get('/api/v1/attributions/stats', (req: Request, res: Response) => {
  const stats = attributionEngine.getStatistics();
  res.json({ success: true, stats });
});

// Identity resolution endpoints
app.post('/api/v1/identities', (req: Request, res: Response) => {
  try {
    const { record } = req.body;
    identityResolver.addRecord(record);
    res.json({ success: true, message: 'Identity record added' });
  } catch (error: any) {
    logger.error({ error }, 'Failed to add identity record');
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/identities/resolve', async (req: Request, res: Response) => {
  try {
    const result = await identityResolver.resolve();
    res.json({ success: true, result });
  } catch (error: any) {
    logger.error({ error }, 'Failed to resolve identities');
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/identities/match', async (req: Request, res: Response) => {
  try {
    const { record } = req.body;
    const matches = await identityResolver.findMatches(record);
    res.json({ success: true, matches });
  } catch (error: any) {
    logger.error({ error }, 'Failed to find matches');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Digital footprint endpoints
app.post('/api/v1/footprints/:entityId/username', (req: Request, res: Response) => {
  try {
    const { record } = req.body;
    footprintTracker.addUsername(req.params.entityId, record);
    res.json({ success: true, message: 'Username added to footprint' });
  } catch (error: any) {
    logger.error({ error }, 'Failed to add username');
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/footprints/:entityId', (req: Request, res: Response) => {
  const footprint = footprintTracker.getFootprint(req.params.entityId);
  res.json({ success: true, footprint });
});

app.post('/api/v1/footprints/:entityId/analyze', (req: Request, res: Response) => {
  try {
    const footprint = footprintTracker.getFootprint(req.params.entityId);
    const analysis = footprintAnalyzer.analyze(footprint);
    res.json({ success: true, analysis });
  } catch (error: any) {
    logger.error({ error }, 'Failed to analyze footprint');
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/footprints/stats', (req: Request, res: Response) => {
  const stats = footprintTracker.getStatistics();
  res.json({ success: true, stats });
});

// Entity linking endpoints
app.post('/api/v1/links', (req: Request, res: Response) => {
  try {
    const { sourceEntity, targetEntity, linkType, evidence } = req.body;
    const link = entityLinker.addLink(sourceEntity, targetEntity, linkType, evidence);
    res.json({ success: true, link });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create link');
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/links/:entityId', (req: Request, res: Response) => {
  const links = entityLinker.getLinks(req.params.entityId);
  res.json({ success: true, links });
});

app.post('/api/v1/links/discover', async (req: Request, res: Response) => {
  try {
    const { entities, linkType } = req.body;
    const links = await entityLinker.discoverLinks(new Map(Object.entries(entities)), linkType);
    res.json({ success: true, links });
  } catch (error: any) {
    logger.error({ error }, 'Failed to discover links');
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/links/result', (req: Request, res: Response) => {
  const result = entityLinker.generateResult();
  res.json({ success: true, result });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  logger.info(`Attribution service listening on port ${port}`);
});

export default app;
