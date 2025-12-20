/**
 * ETL Service - Comprehensive data pipeline and ETL API
 * Provides REST API for managing and executing ETL pipelines
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { PinoLoggerOptions } from 'fastify/types/logger';
import { Pool } from 'pg';
import winston from 'winston';

import {
  PipelineExecutor,
  DataQualityMonitor,
  CDCEngine,
  IncrementalLoader,
  CDCStrategy,
  QualityDimension
} from '@intelgraph/etl-framework';

import {
  DataSourceConfig,
  PipelineRun,
  PipelineStatus,
  DataQualityReport
} from '@intelgraph/data-integration/src/types';

// Configuration
const config = {
  port: parseInt(process.env.ETL_SERVICE_PORT || '4020', 10),
  host: process.env.ETL_SERVICE_HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/summit',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Winston logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Fastify logger options
const fastifyLogger: PinoLoggerOptions = {
  level: config.logLevel
};

// In-memory storage for pipelines and runs (replace with database in production)
const pipelines = new Map<string, DataSourceConfig>();
const pipelineRuns = new Map<string, PipelineRun[]>();
const cdcEngines = new Map<string, CDCEngine>();
const qualityReports = new Map<string, DataQualityReport>();

// Initialize Fastify
const server: FastifyInstance = Fastify({
  logger: fastifyLogger,
  requestIdLogLabel: 'requestId',
  disableRequestLogging: false
});

// Plugins
await server.register(fastifyHelmet, {
  contentSecurityPolicy: false
});

await server.register(fastifyCors, {
  origin: config.corsOrigin,
  credentials: true
});

// Health check endpoint
server.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    await pool.query('SELECT 1');
    await pool.end();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'etl-service',
      dependencies: {
        database: 'healthy'
      }
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'etl-service',
      dependencies: {
        database: 'unhealthy'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Pipeline Management Endpoints

/**
 * Create new pipeline
 */
server.post<{ Body: DataSourceConfig }>(
  '/pipelines',
  async (request: FastifyRequest<{ Body: DataSourceConfig }>, reply: FastifyReply) => {
    try {
      const pipelineConfig = request.body;

      if (!pipelineConfig.id || !pipelineConfig.name) {
        reply.code(400);
        return { error: 'Pipeline ID and name are required' };
      }

      pipelines.set(pipelineConfig.id, pipelineConfig);
      pipelineRuns.set(pipelineConfig.id, []);

      logger.info(`Created pipeline: ${pipelineConfig.id} - ${pipelineConfig.name}`);

      reply.code(201);
      return pipelineConfig;
    } catch (error) {
      logger.error('Error creating pipeline', { error });
      reply.code(500);
      return { error: 'Failed to create pipeline' };
    }
  }
);

/**
 * List all pipelines
 */
server.get('/pipelines', async (request: FastifyRequest, reply: FastifyReply) => {
  return Array.from(pipelines.values());
});

/**
 * Get pipeline by ID
 */
server.get<{ Params: { id: string } }>(
  '/pipelines/:id',
  async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const pipeline = pipelines.get(id);

    if (!pipeline) {
      reply.code(404);
      return { error: 'Pipeline not found' };
    }

    return pipeline;
  }
);

/**
 * Update pipeline
 */
server.put<{ Params: { id: string }; Body: DataSourceConfig }>(
  '/pipelines/:id',
  async (
    request: FastifyRequest<{ Params: { id: string }; Body: DataSourceConfig }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const pipelineConfig = request.body;

    if (!pipelines.has(id)) {
      reply.code(404);
      return { error: 'Pipeline not found' };
    }

    pipelines.set(id, pipelineConfig);

    logger.info(`Updated pipeline: ${id}`);

    return pipelineConfig;
  }
);

/**
 * Delete pipeline
 */
server.delete<{ Params: { id: string } }>(
  '/pipelines/:id',
  async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    if (!pipelines.has(id)) {
      reply.code(404);
      return { error: 'Pipeline not found' };
    }

    pipelines.delete(id);
    pipelineRuns.delete(id);

    // Stop CDC engine if running
    if (cdcEngines.has(id)) {
      const cdcEngine = cdcEngines.get(id)!;
      await cdcEngine.stop();
      await cdcEngine.disconnect();
      cdcEngines.delete(id);
    }

    logger.info(`Deleted pipeline: ${id}`);

    reply.code(204);
    return {};
  }
);

// Pipeline Execution Endpoints

/**
 * Execute pipeline
 */
server.post<{ Params: { id: string } }>(
  '/pipelines/:id/execute',
  async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const pipelineConfig = pipelines.get(id);

    if (!pipelineConfig) {
      reply.code(404);
      return { error: 'Pipeline not found' };
    }

    try {
      logger.info(`Executing pipeline: ${id}`);

      // Create executor
      const executor = new PipelineExecutor(logger);

      // Create connector (simplified - in production would use factory pattern)
      const connector = createConnector(pipelineConfig);

      // Execute pipeline
      const run = await executor.execute(connector, pipelineConfig);

      // Store run history
      const runs = pipelineRuns.get(id) || [];
      runs.push(run);
      pipelineRuns.set(id, runs);

      // Generate data quality report if data is available
      if (run.recordsLoaded > 0) {
        const qualityMonitor = new DataQualityMonitor(logger);
        // In production, would fetch actual data for quality assessment
        // For now, create a placeholder report
        const qualityReport: DataQualityReport = {
          pipelineRunId: run.id,
          timestamp: new Date(),
          overallScore: 95.0,
          dimensions: {
            completeness: 98.0,
            accuracy: 95.0,
            consistency: 93.0,
            timeliness: 94.0,
            validity: 96.0,
            uniqueness: 99.0
          },
          issues: [],
          statistics: {
            totalRecords: run.recordsLoaded,
            nullCounts: {},
            distinctCounts: {},
            minValues: {},
            maxValues: {},
            averages: {},
            standardDeviations: {}
          }
        };

        qualityReports.set(run.id, qualityReport);
      }

      logger.info(`Pipeline execution completed: ${id}`, {
        runId: run.id,
        status: run.status,
        recordsLoaded: run.recordsLoaded
      });

      return run;
    } catch (error) {
      logger.error('Error executing pipeline', { pipelineId: id, error });
      reply.code(500);
      return { error: 'Pipeline execution failed' };
    }
  }
);

/**
 * Get pipeline runs
 */
server.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
  '/pipelines/:id/runs',
  async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const limit = parseInt(request.query.limit || '100', 10);

    if (!pipelines.has(id)) {
      reply.code(404);
      return { error: 'Pipeline not found' };
    }

    const runs = pipelineRuns.get(id) || [];
    return runs.slice(-limit);
  }
);

/**
 * Get specific pipeline run
 */
server.get<{ Params: { id: string; runId: string } }>(
  '/pipelines/:id/runs/:runId',
  async (
    request: FastifyRequest<{ Params: { id: string; runId: string } }>,
    reply: FastifyReply
  ) => {
    const { id, runId } = request.params;

    if (!pipelines.has(id)) {
      reply.code(404);
      return { error: 'Pipeline not found' };
    }

    const runs = pipelineRuns.get(id) || [];
    const run = runs.find(r => r.id === runId);

    if (!run) {
      reply.code(404);
      return { error: 'Pipeline run not found' };
    }

    return run;
  }
);

// CDC Endpoints

/**
 * Start CDC for pipeline
 */
server.post<{ Params: { id: string } }>(
  '/pipelines/:id/cdc/start',
  async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const pipelineConfig = pipelines.get(id);

    if (!pipelineConfig) {
      reply.code(404);
      return { error: 'Pipeline not found' };
    }

    if (cdcEngines.has(id)) {
      reply.code(400);
      return { error: 'CDC already running for this pipeline' };
    }

    try {
      // Create CDC engine (simplified configuration)
      const cdcEngine = new CDCEngine(
        {
          strategy: CDCStrategy.TIMESTAMP,
          sourceTable: pipelineConfig.name,
          primaryKeys: ['id'],
          trackingColumn: 'updated_at',
          pollIntervalSeconds: 60,
          batchSize: 1000
        },
        logger
      );

      // Connect to source database
      await cdcEngine.connect(config.databaseUrl);

      // Start CDC capture
      await cdcEngine.start();

      // Store engine reference
      cdcEngines.set(id, cdcEngine);

      logger.info(`Started CDC for pipeline: ${id}`);

      return { message: 'CDC started successfully', pipelineId: id };
    } catch (error) {
      logger.error('Error starting CDC', { pipelineId: id, error });
      reply.code(500);
      return { error: 'Failed to start CDC' };
    }
  }
);

/**
 * Stop CDC for pipeline
 */
server.post<{ Params: { id: string } }>(
  '/pipelines/:id/cdc/stop',
  async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    if (!cdcEngines.has(id)) {
      reply.code(404);
      return { error: 'CDC not running for this pipeline' };
    }

    try {
      const cdcEngine = cdcEngines.get(id)!;
      await cdcEngine.stop();
      await cdcEngine.disconnect();
      cdcEngines.delete(id);

      logger.info(`Stopped CDC for pipeline: ${id}`);

      return { message: 'CDC stopped successfully', pipelineId: id };
    } catch (error) {
      logger.error('Error stopping CDC', { pipelineId: id, error });
      reply.code(500);
      return { error: 'Failed to stop CDC' };
    }
  }
);

// Data Quality Endpoints

/**
 * Get quality report for pipeline run
 */
server.get<{ Params: { runId: string } }>(
  '/quality/reports/:runId',
  async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
    const { runId } = request.params;
    const report = qualityReports.get(runId);

    if (!report) {
      reply.code(404);
      return { error: 'Quality report not found' };
    }

    return report;
  }
);

// Metrics Endpoint

/**
 * Get service metrics
 */
server.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
  const totalPipelines = pipelines.size;
  const activeCDCEngines = cdcEngines.size;

  let totalRuns = 0;
  let successfulRuns = 0;
  let failedRuns = 0;
  let totalRecordsProcessed = 0;

  for (const runs of pipelineRuns.values()) {
    totalRuns += runs.length;

    for (const run of runs) {
      if (run.status === PipelineStatus.SUCCESS) {
        successfulRuns++;
      } else if (run.status === PipelineStatus.FAILED) {
        failedRuns++;
      }

      totalRecordsProcessed += run.recordsLoaded;
    }
  }

  return {
    totalPipelines,
    activeCDCEngines,
    totalRuns,
    successfulRuns,
    failedRuns,
    totalRecordsProcessed,
    timestamp: new Date().toISOString()
  };
});

// Helper functions

function createConnector(config: DataSourceConfig): any {
  // Simplified connector factory
  // In production, would use proper connector instances based on source type
  return {
    connect: async () => {},
    disconnect: async () => {},
    testConnection: async () => true,
    extract: async function* () {
      yield [];
    },
    getSchema: async () => ({}),
    getCapabilities: () => ({
      supportsStreaming: false,
      supportsIncremental: false,
      supportsCDC: false,
      supportsSchema: false,
      supportsPartitioning: false,
      maxConcurrentConnections: 1
    })
  };
}

// Start server
async function start() {
  try {
    await server.listen({ port: config.port, host: config.host });

    logger.info(`ETL Service started on ${config.host}:${config.port}`);
    logger.info(`Health check: http://${config.host}:${config.port}/health`);
  } catch (error) {
    logger.error('Error starting server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Stop all CDC engines
  for (const [id, cdcEngine] of cdcEngines.entries()) {
    logger.info(`Stopping CDC engine for pipeline: ${id}`);
    await cdcEngine.stop();
    await cdcEngine.disconnect();
  }

  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  // Stop all CDC engines
  for (const [id, cdcEngine] of cdcEngines.entries()) {
    logger.info(`Stopping CDC engine for pipeline: ${id}`);
    await cdcEngine.stop();
    await cdcEngine.disconnect();
  }

  await server.close();
  process.exit(0);
});

// Start the service
start();
