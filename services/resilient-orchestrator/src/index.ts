/**
 * Resilient Workflow Orchestrator
 *
 * Massive-scale, resilient automation workflows across hybrid, denied,
 * or degraded network environments with failover, satellite comms,
 * adaptive routing, self-healing, and real-time command reporting.
 */

import { WorkflowOrchestrator } from './workflows/WorkflowOrchestrator.js';
import { NetworkTopologyManager } from './routing/NetworkTopologyManager.js';
import { SatelliteCommHandler } from './comms/SatelliteCommHandler.js';
import { FailoverController } from './comms/FailoverController.js';
import { SelfHealingEngine } from './healing/SelfHealingEngine.js';
import { CommandReporter } from './reporting/CommandReporter.js';
import { CoalitionFederator } from './federation/CoalitionFederator.js';
import { logger } from './utils/logger.js';
import { registry } from './utils/metrics.js';
import express from 'express';

// Re-export all components
export {
  WorkflowOrchestrator,
  NetworkTopologyManager,
  SatelliteCommHandler,
  FailoverController,
  SelfHealingEngine,
  CommandReporter,
  CoalitionFederator,
};

// Re-export types
export * from './types.js';

/**
 * Create and start the orchestrator service
 */
async function main(): Promise<void> {
  const config = {
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    nodeId: process.env.NODE_ID ?? `orchestrator-${process.pid}`,
    reportingPort: parseInt(process.env.REPORTING_PORT ?? '8080'),
    maxConcurrentWorkflows: parseInt(process.env.MAX_WORKFLOWS ?? '100'),
    maxConcurrentTasks: parseInt(process.env.MAX_TASKS ?? '1000'),
  };

  logger.info('Initializing Resilient Workflow Orchestrator', config);

  const orchestrator = new WorkflowOrchestrator(config);

  // Setup HTTP server for health and metrics
  const app = express();
  const httpPort = parseInt(process.env.HTTP_PORT ?? '3000');

  app.get('/health', (req, res) => {
    const stats = orchestrator.getStats();
    res.json({
      status: 'healthy',
      nodeId: config.nodeId,
      uptime: process.uptime(),
      workflows: stats.workflows,
      network: stats.network,
    });
  });

  app.get('/health/ready', (req, res) => {
    res.json({ ready: true });
  });

  app.get('/health/live', (req, res) => {
    res.json({ live: true });
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  app.get('/stats', (req, res) => {
    res.json(orchestrator.getStats());
  });

  // Start orchestrator
  await orchestrator.start();

  // Start HTTP server
  app.listen(httpPort, () => {
    logger.info(`HTTP server listening on port ${httpPort}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    await orchestrator.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('Resilient Workflow Orchestrator ready');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Failed to start orchestrator', { error });
    process.exit(1);
  });
}
