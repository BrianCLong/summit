/**
 * Bundle Pipeline Service - Main Entry Point
 * Evidence Bundle & Briefing Pipeline for IntelGraph
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Pool } from 'pg';
import pino from 'pino';

import { registerRoutes, type RouteServices } from './api/routes.js';
import { BundleAssemblyService } from './services/BundleAssemblyService.js';
import { BriefingAssemblyService } from './services/BriefingAssemblyService.js';
import { PublishingService } from './services/PublishingService.js';
import { SchedulingService } from './services/SchedulingService.js';
import { ProvenanceClient } from './clients/ProvenanceClient.js';
import { CaseClient } from './clients/CaseClient.js';
import { GovernanceClient } from './clients/GovernanceClient.js';

// Re-export types
export * from './types/index.js';
export { BundleAssemblyService } from './services/BundleAssemblyService.js';
export { BriefingAssemblyService } from './services/BriefingAssemblyService.js';
export { PublishingService } from './services/PublishingService.js';
export { SchedulingService } from './services/SchedulingService.js';
export { ManifestService } from './services/ManifestService.js';
export { BundleRepository } from './repositories/BundleRepository.js';
export { ProvenanceClient } from './clients/ProvenanceClient.js';
export { CaseClient } from './clients/CaseClient.js';
export { GovernanceClient } from './clients/GovernanceClient.js';

// Configuration
const config = {
  port: parseInt(process.env.PORT || '3500', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'intelgraph',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
  },
  services: {
    provenanceUrl: process.env.PROVENANCE_SERVICE_URL || 'http://localhost:3501',
    caseUrl: process.env.CASE_SERVICE_URL || 'http://localhost:4000',
    governanceUrl: process.env.GOVERNANCE_SERVICE_URL || 'http://localhost:3502',
  },
};

// Initialize logger
const logger = pino({
  level: config.logLevel,
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// Initialize database pool
const pool = new Pool(config.database);

// Initialize clients
const provenanceClient = new ProvenanceClient(config.services.provenanceUrl, logger);
const caseClient = new CaseClient(config.services.caseUrl, logger);
const governanceClient = new GovernanceClient(config.services.governanceUrl, logger);

// Initialize services
const bundleAssemblyService = new BundleAssemblyService(
  pool,
  provenanceClient,
  caseClient,
  governanceClient,
  logger,
);

const briefingAssemblyService = new BriefingAssemblyService(
  pool,
  provenanceClient,
  caseClient,
  governanceClient,
  logger,
);

const publishingService = new PublishingService(
  pool,
  provenanceClient,
  governanceClient,
  logger,
);

const schedulingService = new SchedulingService(
  pool,
  briefingAssemblyService,
  logger,
);

// Initialize Fastify
const app = Fastify({
  logger: logger as any,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
});

// Register plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
});

await app.register(helmet, {
  contentSecurityPolicy: false,
});

// Register routes
const services: RouteServices = {
  bundleAssembly: bundleAssemblyService,
  briefingAssembly: briefingAssemblyService,
  publishing: publishingService,
  scheduling: schedulingService,
};

await registerRoutes(app, services, logger);

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');

  try {
    // Stop accepting new connections
    await app.close();

    // Shutdown scheduling service
    await schedulingService.shutdown();

    // Close database pool
    await pool.end();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connection established');

    // Initialize scheduling service
    await schedulingService.initialize();
    logger.info('Scheduling service initialized');

    // Start listening
    await app.listen({ port: config.port, host: config.host });
    logger.info(
      { port: config.port, host: config.host },
      'Bundle Pipeline Service started',
    );
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

start();
