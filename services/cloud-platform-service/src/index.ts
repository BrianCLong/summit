/**
 * Cloud Platform Service
 * REST API for multi-cloud platform management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import {
  MultiCloudManager,
  CloudCostManager,
  DisasterRecoveryManager,
  CloudProvider,
  MultiCloudDeployment
} from '@summit/cloud-platform';

const logger = pino({ name: 'cloud-platform-service' });
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Initialize managers (would come from config in production)
let multiCloudManager: MultiCloudManager | null = null;
const costManager = new CloudCostManager();

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'cloud-platform' });
});

// Initialize multi-cloud deployment
app.post('/api/cloud/init', async (req, res) => {
  try {
    const deployment: MultiCloudDeployment = req.body;
    multiCloudManager = new MultiCloudManager(deployment);

    const validationResults = await multiCloudManager.validateAllConnections();
    res.status(201).json({
      message: 'Multi-cloud deployment initialized',
      validationResults: Object.fromEntries(validationResults)
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to initialize multi-cloud');
    res.status(500).json({ error: error.message });
  }
});

// List resources across all clouds
app.get('/api/cloud/resources', async (req, res) => {
  try {
    if (!multiCloudManager) {
      return res.status(400).json({ error: 'Multi-cloud not initialized' });
    }

    const { type } = req.query;
    const resources = await multiCloudManager.listAllResources(type as string);
    res.json({ resources: Object.fromEntries(resources) });
  } catch (error: any) {
    logger.error({ error }, 'Failed to list resources');
    res.status(500).json({ error: error.message });
  }
});

// Get optimization recommendations
app.get('/api/cloud/recommendations', async (req, res) => {
  try {
    if (!multiCloudManager) {
      return res.status(400).json({ error: 'Multi-cloud not initialized' });
    }

    const recommendations = await multiCloudManager.getOptimizationRecommendations();
    res.json({ recommendations });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get recommendations');
    res.status(500).json({ error: error.message });
  }
});

// Cost management endpoints
app.post('/api/cost/budget', async (req, res) => {
  try {
    costManager.setBudget(req.body);
    res.status(201).json({ message: 'Budget set successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Failed to set budget');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cost/trends', async (req, res) => {
  try {
    const { provider, days } = req.query;
    const trends = costManager.getCostTrends(
      provider as CloudProvider,
      days ? parseInt(days as string) : 30
    );
    res.json({ trends });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get cost trends');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cost/forecast', async (req, res) => {
  try {
    const { provider } = req.query;
    const forecast = costManager.forecastNextMonth(provider as CloudProvider);
    res.json({ forecast });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get forecast');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cost/anomalies', async (req, res) => {
  try {
    const { provider } = req.query;
    const anomalies = costManager.detectAnomalies(provider as CloudProvider);
    res.json({ anomalies });
  } catch (error: any) {
    logger.error({ error }, 'Failed to detect anomalies');
    res.status(500).json({ error: error.message });
  }
});

// Disaster recovery endpoints
app.post('/api/dr/failover', async (req, res) => {
  try {
    if (!multiCloudManager) {
      return res.status(400).json({ error: 'Multi-cloud not initialized' });
    }

    const { fromProvider, toProvider, reason } = req.body;

    const drManager = new DisasterRecoveryManager(
      {
        enabled: true,
        rto: 60,
        rpo: 15,
        backupRegions: [],
        failoverPriority: [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP],
        automatedFailover: true
      },
      multiCloudManager
    );

    const event = await drManager.initiateFailover(fromProvider, toProvider, reason);
    res.json({ event });
  } catch (error: any) {
    logger.error({ error }, 'Failover failed');
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 4300;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Cloud platform service started');
});

export default app;
