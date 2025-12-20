import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pino } from 'pino';
import pinoHttp from 'pino-http';
import { EdgeNodeManager } from '@intelgraph/edge-computing';
import { ContainerOrchestrator } from '@intelgraph/edge-runtime';
import { InferenceEngine } from '@intelgraph/edge-ai';
import { FederatedTrainer } from '@intelgraph/federated-learning';
import { SyncManager } from '@intelgraph/edge-sync';
import { createNodeRoutes } from './api/nodes';
import { createDeploymentRoutes } from './api/deployments';
import { createInferenceRoutes } from './api/inference';
import { createFederatedRoutes } from './api/federated';

const logger = pino({ name: 'edge-orchestrator' });

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(pinoHttp({ logger }));

// Initialize services
const nodeManager = new EdgeNodeManager(logger);
const containerOrchestrator = new ContainerOrchestrator(undefined, logger);
const inferenceEngine = new InferenceEngine({ logger });
const federatedTrainer = new FederatedTrainer(
  {
    minParticipants: 2,
    maxRounds: 100,
    aggregationStrategy: 'fedavg',
    clientSelection: 'random',
    roundTimeout: 300
  },
  logger
);
const syncManager = new SyncManager(
  {
    endpoint: process.env.CLOUD_ENDPOINT || 'http://localhost:9000',
    syncInterval: 300,
    maxConcurrent: 5,
    maxRetries: 3,
    retryDelay: 1000,
    compressionEnabled: true,
    encryptionEnabled: true,
    offlineQueue: {
      enabled: true,
      maxSize: 1000,
      persistToDisk: true
    }
  },
  logger
);

// API Routes
app.use('/api/nodes', createNodeRoutes(nodeManager));
app.use('/api/deployments', createDeploymentRoutes(containerOrchestrator));
app.use('/api/inference', createInferenceRoutes(inferenceEngine));
app.use('/api/federated', createFederatedRoutes(federatedTrainer));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      nodeManager: 'running',
      containerOrchestrator: 'running',
      inferenceEngine: 'running',
      federatedTrainer: 'running',
      syncManager: syncManager.getStatus().isOnline ? 'online' : 'offline'
    }
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const nodeStats = nodeManager.getClusterStats();
  const syncStatus = syncManager.getStatus();
  const federatedStats = federatedTrainer.getStats();

  res.json({
    nodes: nodeStats,
    sync: syncStatus,
    federated: federatedStats,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
async function start() {
  try {
    // Start sync manager
    await syncManager.start();

    app.listen(port, () => {
      logger.info({ port }, 'Edge orchestrator service started');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await syncManager.stop();
      await nodeManager.shutdown();
      await inferenceEngine.shutdown();
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
    process.exit(1);
  }
}

start();
