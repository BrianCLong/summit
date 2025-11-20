/**
 * Identity Resolution Service - Real-time identity resolution API
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { IdentityResolver } from '@intelgraph/identity-resolution';
import { deduplicateRecords, assessDataQuality, generateQualityReport } from '@intelgraph/identity-resolution';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const port = process.env.PORT || 3101;

// Initialize resolver
const resolver = new IdentityResolver({
  matchingThreshold: 0.75,
  autoMergeThreshold: 0.9,
  matchingMethods: ['deterministic', 'probabilistic', 'hybrid'],
  fieldWeights: {
    email: 0.95,
    phone: 0.9,
    ssn: 0.98,
    name: 0.75,
    address: 0.65,
    dob: 0.85
  },
  enableMachineLearning: false,
  enableProbabilistic: true
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'identity-resolution-service', timestamp: new Date() });
});

// Add identity record
app.post('/api/v1/records', (req: Request, res: Response) => {
  try {
    const { record } = req.body;

    if (!record || !record.id) {
      return res.status(400).json({ success: false, error: 'Invalid record' });
    }

    resolver.addRecord(record);
    res.json({ success: true, message: 'Record added successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Failed to add record');
    res.status(400).json({ success: false, error: error.message });
  }
});

// Find matches for a record
app.post('/api/v1/records/match', async (req: Request, res: Response) => {
  try {
    const { record } = req.body;

    if (!record) {
      return res.status(400).json({ success: false, error: 'Record required' });
    }

    const matches = await resolver.findMatches(record);
    res.json({ success: true, matches, count: matches.length });
  } catch (error: any) {
    logger.error({ error }, 'Failed to find matches');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve all records
app.post('/api/v1/resolve', async (req: Request, res: Response) => {
  try {
    const result = await resolver.resolve();
    res.json({ success: true, result });
  } catch (error: any) {
    logger.error({ error }, 'Failed to resolve records');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cluster by ID
app.get('/api/v1/clusters/:id', (req: Request, res: Response) => {
  const cluster = resolver.getCluster(req.params.id);

  if (cluster) {
    res.json({ success: true, cluster });
  } else {
    res.status(404).json({ success: false, error: 'Cluster not found' });
  }
});

// Get all clusters
app.get('/api/v1/clusters', (req: Request, res: Response) => {
  const clusters = resolver.getClusters();
  res.json({ success: true, clusters, count: clusters.length });
});

// Deduplicate records
app.post('/api/v1/deduplicate', async (req: Request, res: Response) => {
  try {
    const { records, threshold = 0.85 } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Records array required' });
    }

    const result = await deduplicateRecords(records, threshold);
    res.json({ success: true, result });
  } catch (error: any) {
    logger.error({ error }, 'Failed to deduplicate records');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assess data quality
app.post('/api/v1/quality/assess', (req: Request, res: Response) => {
  try {
    const { record } = req.body;

    if (!record) {
      return res.status(400).json({ success: false, error: 'Record required' });
    }

    const quality = assessDataQuality(record);
    res.json({ success: true, quality });
  } catch (error: any) {
    logger.error({ error }, 'Failed to assess quality');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate quality report
app.post('/api/v1/quality/report', (req: Request, res: Response) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Records array required' });
    }

    const report = generateQualityReport(records);
    res.json({ success: true, report });
  } catch (error: any) {
    logger.error({ error }, 'Failed to generate quality report');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear all data
app.delete('/api/v1/clear', (req: Request, res: Response) => {
  resolver.clear();
  res.json({ success: true, message: 'All data cleared' });
});

// Get resolver statistics
app.get('/api/v1/stats', (req: Request, res: Response) => {
  const clusters = resolver.getClusters();

  const stats = {
    totalClusters: clusters.length,
    totalRecords: clusters.reduce((sum, c) => sum + c.records.length, 0),
    averageClusterSize: clusters.length > 0
      ? clusters.reduce((sum, c) => sum + c.records.length, 0) / clusters.length
      : 0,
    averageConfidence: clusters.length > 0
      ? clusters.reduce((sum, c) => sum + c.confidence, 0) / clusters.length
      : 0
  };

  res.json({ success: true, stats });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  logger.info(`Identity resolution service listening on port ${port}`);
});

export default app;
