/**
 * HTTP API Routes
 *
 * REST API endpoints for the Time-Series Metrics Platform.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { IngestionPipeline, IngestionBatch } from '../ingestion/ingestion-pipeline.js';
import { QueryEngine, QueryOptions } from '../query/query-engine.js';
import { SLOCalculator } from '../slo/slo-calculator.js';
import { StorageTierManager } from '../storage/tier-manager.js';
import { TenantConfig, createTenantConfig, TenantTier } from '../models/tenant.js';
import { MetricSchema } from '../models/metric-types.js';

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export interface RouterDependencies {
  ingestionPipeline: IngestionPipeline;
  queryEngine: QueryEngine;
  sloCalculator: SLOCalculator;
  storageManager: StorageTierManager;
  logger: Logger;
}

export function createRouter(deps: RouterDependencies): Router {
  const router = Router();
  const { ingestionPipeline, queryEngine, sloCalculator, storageManager, logger } = deps;

  // ============================================================================
  // MIDDLEWARE
  // ============================================================================

  /**
   * Tenant extraction middleware
   */
  function extractTenant(req: Request, res: Response, next: NextFunction): void {
    const tenantId =
      req.headers['x-tenant-id'] as string ||
      req.query.tenant_id as string ||
      'default';

    (req as any).tenantId = tenantId;
    next();
  }

  /**
   * Error handler
   */
  function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    logger.error('API error', {
      error: err.message,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      status: 'error',
      error: err.message,
    });
  }

  router.use(extractTenant);

  // ============================================================================
  // HEALTH ENDPOINTS
  // ============================================================================

  /**
   * Health check
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'timeseries-metrics',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Readiness check
   */
  router.get('/health/ready', async (req, res) => {
    try {
      // Check storage connectivity
      await storageManager.getTierStats();

      res.json({
        status: 'ready',
        checks: {
          storage: 'ok',
          ingestion: 'ok',
          query: 'ok',
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // WRITE ENDPOINTS
  // ============================================================================

  /**
   * Write metrics (Prometheus remote write compatible)
   */
  router.post('/api/v1/write', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const metrics = Array.isArray(req.body) ? req.body : [req.body];

      // Validate metrics
      const validatedMetrics = [];
      const errors = [];

      for (const metric of metrics) {
        const result = MetricSchema.safeParse(metric);
        if (result.success) {
          validatedMetrics.push(result.data);
        } else {
          errors.push({
            metric: metric.name,
            error: result.error.message,
          });
        }
      }

      const batch: IngestionBatch = {
        tenantId,
        metrics: validatedMetrics,
        receivedAt: Date.now(),
      };

      const result = await ingestionPipeline.ingest(batch);

      res.json({
        status: 'success',
        accepted: result.accepted,
        rejected: result.rejected,
        errors: [...errors, ...result.errors],
      });
    } catch (error) {
      logger.error('Write error', { error });
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // QUERY ENDPOINTS
  // ============================================================================

  /**
   * Instant query (Prometheus API compatible)
   */
  router.get('/api/v1/query', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const query = req.query.query as string;
      const time = req.query.time
        ? parseFloat(req.query.time as string) * 1000
        : Date.now();
      const timeout = req.query.timeout
        ? parseInt(req.query.timeout as string, 10) * 1000
        : 30000;

      if (!query) {
        return res.status(400).json({
          status: 'error',
          errorType: 'bad_data',
          error: 'missing query parameter',
        });
      }

      const options: QueryOptions = {
        tenantId,
        timeout,
      };

      const result = await queryEngine.instantQuery(query, time, options);

      res.json({
        status: 'success',
        data: {
          resultType: result.resultType,
          result: result.data,
        },
        stats: result.stats,
      });
    } catch (error) {
      logger.error('Query error', { error });
      res.status(400).json({
        status: 'error',
        errorType: 'execution',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Range query (Prometheus API compatible)
   */
  router.get('/api/v1/query_range', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const query = req.query.query as string;
      const start = parseFloat(req.query.start as string) * 1000;
      const end = parseFloat(req.query.end as string) * 1000;
      const step = parseFloat(req.query.step as string) * 1000;
      const timeout = req.query.timeout
        ? parseInt(req.query.timeout as string, 10) * 1000
        : 60000;

      if (!query || isNaN(start) || isNaN(end) || isNaN(step)) {
        return res.status(400).json({
          status: 'error',
          errorType: 'bad_data',
          error: 'missing or invalid query parameters',
        });
      }

      const options: QueryOptions = {
        tenantId,
        timeout,
      };

      const result = await queryEngine.rangeQuery(query, start, end, step, options);

      res.json({
        status: 'success',
        data: {
          resultType: result.resultType,
          result: result.data,
        },
        stats: result.stats,
      });
    } catch (error) {
      logger.error('Range query error', { error });
      res.status(400).json({
        status: 'error',
        errorType: 'execution',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Series metadata query
   */
  router.get('/api/v1/series', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const match = req.query['match[]'] as string | string[];
      const start = req.query.start
        ? parseFloat(req.query.start as string) * 1000
        : Date.now() - 86400000;
      const end = req.query.end
        ? parseFloat(req.query.end as string) * 1000
        : Date.now();

      // Parse matchers
      const matchers = Array.isArray(match) ? match : [match];

      // For now, return empty series (full implementation would query series_metadata)
      res.json({
        status: 'success',
        data: [],
      });
    } catch (error) {
      logger.error('Series query error', { error });
      res.status(400).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Label names query
   */
  router.get('/api/v1/labels', async (req, res) => {
    try {
      // Return standard labels
      res.json({
        status: 'success',
        data: [
          'service',
          'tenant',
          'region',
          'environment',
          'version',
          'instance',
          'method',
          'path',
          'status',
          'status_code',
        ],
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Label values query
   */
  router.get('/api/v1/label/:name/values', async (req, res) => {
    try {
      const labelName = req.params.name;

      // For now, return empty values (full implementation would query distinct values)
      res.json({
        status: 'success',
        data: [],
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // SLO ENDPOINTS
  // ============================================================================

  /**
   * List SLOs
   */
  router.get('/api/v1/slos', (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const slos = sloCalculator.getRegisteredSLOs(tenantId);

      res.json({
        status: 'success',
        data: slos,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Register SLO
   */
  router.post('/api/v1/slos', (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const definition = {
        ...req.body,
        tenantId,
      };

      sloCalculator.registerSLO(definition);

      res.status(201).json({
        status: 'success',
        data: definition,
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get SLO status
   */
  router.get('/api/v1/slos/:id/status', async (req, res) => {
    try {
      const status = await sloCalculator.calculateStatus(req.params.id);

      res.json({
        status: 'success',
        data: status,
      });
    } catch (error) {
      res.status(404).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get SLO history
   */
  router.get('/api/v1/slos/:id/history', async (req, res) => {
    try {
      const start = req.query.start
        ? parseFloat(req.query.start as string) * 1000
        : Date.now() - 86400000 * 7; // 7 days
      const end = req.query.end
        ? parseFloat(req.query.end as string) * 1000
        : Date.now();
      const step = req.query.step
        ? parseFloat(req.query.step as string) * 1000
        : 3600000; // 1 hour

      const history = await sloCalculator.calculateHistory(
        req.params.id,
        start,
        end,
        step,
      );

      res.json({
        status: 'success',
        data: history,
      });
    } catch (error) {
      res.status(404).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Delete SLO
   */
  router.delete('/api/v1/slos/:id', (req, res) => {
    try {
      sloCalculator.unregisterSLO(req.params.id);

      res.json({
        status: 'success',
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  /**
   * Get storage stats
   */
  router.get('/api/v1/admin/storage/stats', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      const stats = await storageManager.getTierStats(tenantId);

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Trigger downsampling
   */
  router.post('/api/v1/admin/storage/downsample', async (req, res) => {
    try {
      const result = await storageManager.runDownsampling();

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Trigger retention cleanup
   */
  router.post('/api/v1/admin/storage/cleanup', async (req, res) => {
    try {
      const result = await storageManager.runRetentionCleanup();

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get ingestion metrics
   */
  router.get('/api/v1/admin/ingestion/metrics', (req, res) => {
    try {
      const metrics = ingestionPipeline.getMetrics();

      res.json({
        status: 'success',
        data: metrics,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Register tenant
   */
  router.post('/api/v1/admin/tenants', (req, res) => {
    try {
      const { tenantId, name, tier } = req.body;
      const config = createTenantConfig(
        tenantId,
        name,
        tier as TenantTier || TenantTier.FREE,
      );

      ingestionPipeline.registerTenant(config);

      res.status(201).json({
        status: 'success',
        data: config,
      });
    } catch (error) {
      res.status(400).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Flush ingestion buffers
   */
  router.post('/api/v1/admin/ingestion/flush', async (req, res) => {
    try {
      await ingestionPipeline.flushAll();

      res.json({
        status: 'success',
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Clear query cache
   */
  router.post('/api/v1/admin/query/cache/clear', (req, res) => {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      queryEngine.clearCache(tenantId);

      res.json({
        status: 'success',
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // METRICS ENDPOINT (for self-monitoring)
  // ============================================================================

  /**
   * Prometheus metrics endpoint
   */
  router.get('/metrics', (req, res) => {
    const pipelineMetrics = ingestionPipeline.getMetrics();
    const activeQueries = queryEngine.getActiveQueryCount();

    const metrics = `
# HELP timeseries_samples_received_total Total samples received
# TYPE timeseries_samples_received_total counter
timeseries_samples_received_total ${pipelineMetrics.samplesReceived}

# HELP timeseries_samples_accepted_total Total samples accepted
# TYPE timeseries_samples_accepted_total counter
timeseries_samples_accepted_total ${pipelineMetrics.samplesAccepted}

# HELP timeseries_samples_rejected_total Total samples rejected
# TYPE timeseries_samples_rejected_total counter
timeseries_samples_rejected_total ${pipelineMetrics.samplesRejected}

# HELP timeseries_batches_processed_total Total batches processed
# TYPE timeseries_batches_processed_total counter
timeseries_batches_processed_total ${pipelineMetrics.batchesProcessed}

# HELP timeseries_active_queries Current active queries
# TYPE timeseries_active_queries gauge
timeseries_active_queries ${activeQueries}
`.trim();

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  });

  router.use(errorHandler);

  return router;
}
