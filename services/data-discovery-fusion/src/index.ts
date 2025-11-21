import express from 'express';
import { DataDiscoveryFusionEngine } from './DataDiscoveryFusionEngine.js';
import { createRoutes } from './api/routes.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 4100;

async function main() {
  // Initialize engine
  const engine = new DataDiscoveryFusionEngine({
    scanInterval: parseInt(process.env.SCAN_INTERVAL || '60000'),
    autoIngestThreshold: parseFloat(process.env.AUTO_INGEST_THRESHOLD || '0.8'),
    enableAutoDiscovery: process.env.AUTO_DISCOVERY !== 'false',
    enableLearning: process.env.ENABLE_LEARNING !== 'false',
  });

  // Create Express app
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Mount routes
  app.use('/api/v1', createRoutes(engine));

  // Start engine
  engine.start();

  // Start server
  app.listen(PORT, () => {
    logger.info(`Data Discovery & Fusion Engine running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Shutting down...');
    engine.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Failed to start', { error });
  process.exit(1);
});

// Export for testing
export { DataDiscoveryFusionEngine } from './DataDiscoveryFusionEngine.js';
export * from './types.js';
