/**
 * Model Monitoring and Metrics Endpoints
 */

import express, { type Request, type Response } from 'express';
import type { ModelRegistry, DriftMetrics } from '../core/model-registry.js';
import type { PredictionEngine } from '../core/prediction-engine.js';

interface MetricsCollector {
  predictions: {
    total: number;
    byModel: Map<string, number>;
    latencies: number[];
    errors: number;
  };
  startTime: Date;
}

const metrics: MetricsCollector = {
  predictions: {
    total: 0,
    byModel: new Map(),
    latencies: [],
    errors: 0,
  },
  startTime: new Date(),
};

/**
 * Record prediction for metrics
 */
export function recordPrediction(modelId: string, latencyMs: number, error: boolean = false): void {
  metrics.predictions.total++;
  metrics.predictions.byModel.set(
    modelId,
    (metrics.predictions.byModel.get(modelId) || 0) + 1
  );

  // Keep last 1000 latencies
  metrics.predictions.latencies.push(latencyMs);
  if (metrics.predictions.latencies.length > 1000) {
    metrics.predictions.latencies.shift();
  }

  if (error) {
    metrics.predictions.errors++;
  }
}

/**
 * Create monitoring routes
 */
export function createMonitoringRoutes(
  engine: PredictionEngine,
  registry: ModelRegistry
): express.Router {
  const router = express.Router();

  /**
   * GET /metrics - Prometheus-compatible metrics
   */
  router.get('/metrics', (req: Request, res: Response) => {
    const uptimeSeconds = (Date.now() - metrics.startTime.getTime()) / 1000;

    const latencies = metrics.predictions.latencies;
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const p99 = percentile(latencies, 99);

    const prometheusMetrics = [
      '# HELP predictions_total Total number of predictions',
      '# TYPE predictions_total counter',
      `predictions_total ${metrics.predictions.total}`,
      '',
      '# HELP predictions_errors_total Total number of prediction errors',
      '# TYPE predictions_errors_total counter',
      `predictions_errors_total ${metrics.predictions.errors}`,
      '',
      '# HELP prediction_latency_seconds Prediction latency in seconds',
      '# TYPE prediction_latency_seconds summary',
      `prediction_latency_seconds{quantile="0.5"} ${p50 / 1000}`,
      `prediction_latency_seconds{quantile="0.95"} ${p95 / 1000}`,
      `prediction_latency_seconds{quantile="0.99"} ${p99 / 1000}`,
      `prediction_latency_seconds_sum ${latencies.reduce((a, b) => a + b, 0) / 1000}`,
      `prediction_latency_seconds_count ${latencies.length}`,
      '',
      '# HELP uptime_seconds Service uptime in seconds',
      '# TYPE uptime_seconds gauge',
      `uptime_seconds ${uptimeSeconds}`,
      '',
      '# HELP models_active Number of active models',
      '# TYPE models_active gauge',
      `models_active ${engine.listModels().filter(m => m.status === 'active').length}`,
    ];

    // Add per-model metrics
    for (const [modelId, count] of metrics.predictions.byModel.entries()) {
      prometheusMetrics.push(
        `predictions_by_model{model_id="${modelId}"} ${count}`
      );
    }

    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics.join('\n'));
  });

  /**
   * GET /dashboard - Dashboard data
   */
  router.get('/dashboard', (req: Request, res: Response) => {
    const models = engine.listModels();
    const uptimeSeconds = (Date.now() - metrics.startTime.getTime()) / 1000;

    const latencies = metrics.predictions.latencies;
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    const dashboardData = {
      overview: {
        totalPredictions: metrics.predictions.total,
        totalErrors: metrics.predictions.errors,
        errorRate: metrics.predictions.total > 0
          ? (metrics.predictions.errors / metrics.predictions.total * 100).toFixed(2) + '%'
          : '0%',
        avgLatencyMs: avgLatency.toFixed(2),
        p95LatencyMs: percentile(latencies, 95).toFixed(2),
        uptimeHours: (uptimeSeconds / 3600).toFixed(2),
        activeModels: models.filter(m => m.status === 'active').length,
      },
      models: models.map(model => {
        const driftHistory = registry.getDriftHistory(model.id);
        const latestDrift = driftHistory[driftHistory.length - 1];
        const needsRetraining = registry.needsRetraining(model.id);

        return {
          id: model.id,
          name: model.name,
          type: model.type,
          version: model.version,
          status: model.status,
          predictions: metrics.predictions.byModel.get(model.id) || 0,
          performance: model.performance,
          drift: latestDrift ? {
            dataDrift: latestDrift.dataDrift,
            conceptDrift: latestDrift.conceptDrift,
            performanceDrift: latestDrift.performanceDrift,
            timestamp: latestDrift.timestamp,
          } : null,
          needsRetraining,
        };
      }),
      latencyHistogram: createHistogram(latencies),
      recentActivity: {
        last24h: metrics.predictions.total, // Simplified
        lastHour: metrics.predictions.total,
      },
    };

    res.json(dashboardData);
  });

  /**
   * GET /drift/:modelId - Get drift analysis for a model
   */
  router.get('/drift/:modelId', (req: Request, res: Response) => {
    const { modelId } = req.params;
    const driftHistory = registry.getDriftHistory(modelId);

    if (driftHistory.length === 0) {
      res.json({
        modelId,
        status: 'no_data',
        message: 'No drift metrics recorded yet',
      });
      return;
    }

    const latest = driftHistory[driftHistory.length - 1];
    const trend = calculateDriftTrend(driftHistory);

    res.json({
      modelId,
      status: registry.needsRetraining(modelId) ? 'needs_retraining' : 'stable',
      current: {
        dataDrift: latest.dataDrift,
        conceptDrift: latest.conceptDrift,
        performanceDrift: latest.performanceDrift,
        timestamp: latest.timestamp,
      },
      trend,
      history: driftHistory.slice(-30), // Last 30 entries
      thresholds: {
        dataDrift: 0.25,
        conceptDrift: 0.25,
        performanceDrift: 0.15,
      },
    });
  });

  /**
   * POST /drift/:modelId - Record drift metrics
   */
  router.post('/drift/:modelId', (req: Request, res: Response) => {
    const { modelId } = req.params;
    const { dataDrift, conceptDrift, performanceDrift } = req.body;

    if (dataDrift === undefined || conceptDrift === undefined || performanceDrift === undefined) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'dataDrift, conceptDrift, and performanceDrift are required',
      });
      return;
    }

    const driftMetrics: DriftMetrics = {
      dataDrift,
      conceptDrift,
      performanceDrift,
      timestamp: new Date(),
    };

    registry.recordDrift(modelId, driftMetrics);

    res.json({
      message: 'Drift metrics recorded',
      modelId,
      needsRetraining: registry.needsRetraining(modelId),
    });
  });

  /**
   * GET /alerts - Get active alerts
   */
  router.get('/alerts', (req: Request, res: Response) => {
    const models = engine.listModels();
    const alerts: Array<{
      severity: 'warning' | 'critical';
      modelId: string;
      type: string;
      message: string;
      timestamp: Date;
    }> = [];

    for (const model of models) {
      if (registry.needsRetraining(model.id)) {
        alerts.push({
          severity: 'warning',
          modelId: model.id,
          type: 'drift',
          message: `Model ${model.name} needs retraining due to detected drift`,
          timestamp: new Date(),
        });
      }

      const errorRate = metrics.predictions.errors / Math.max(1, metrics.predictions.total);
      if (errorRate > 0.05) {
        alerts.push({
          severity: 'critical',
          modelId: model.id,
          type: 'error_rate',
          message: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
          timestamp: new Date(),
        });
      }
    }

    res.json({ alerts, count: alerts.length });
  });

  return router;
}

/**
 * Calculate percentile
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Create histogram for visualization
 */
function createHistogram(values: number[]): { bucket: string; count: number }[] {
  const buckets = [10, 50, 100, 250, 500, 1000, 2500, 5000];
  const histogram: { bucket: string; count: number }[] = [];

  let prevBucket = 0;
  for (const bucket of buckets) {
    const count = values.filter(v => v > prevBucket && v <= bucket).length;
    histogram.push({ bucket: `${prevBucket}-${bucket}ms`, count });
    prevBucket = bucket;
  }

  const overflow = values.filter(v => v > buckets[buckets.length - 1]).length;
  histogram.push({ bucket: `>${buckets[buckets.length - 1]}ms`, count: overflow });

  return histogram;
}

/**
 * Calculate drift trend
 */
function calculateDriftTrend(history: DriftMetrics[]): {
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;
} {
  if (history.length < 2) {
    return { direction: 'stable', rate: 0 };
  }

  const recent = history.slice(-5);
  const older = history.slice(-10, -5);

  const recentAvg = recent.reduce((sum, d) => sum + d.dataDrift, 0) / recent.length;
  const olderAvg = older.length > 0
    ? older.reduce((sum, d) => sum + d.dataDrift, 0) / older.length
    : recentAvg;

  const rate = recentAvg - olderAvg;

  let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (rate > 0.02) direction = 'increasing';
  else if (rate < -0.02) direction = 'decreasing';

  return { direction, rate };
}
