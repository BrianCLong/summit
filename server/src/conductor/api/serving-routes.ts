// Serving Lane Metrics API Routes
import express from 'express';
import { prometheusConductorMetrics } from '../observability/prometheus';

const router = express.Router();

interface ServingMetric {
  ts: number;
  qDepth: number;
  batch: number;
  kvHit: number;
  p95Latency: number;
  throughput: number;
  utilizationCpu: number;
  utilizationGpu: number;
  memoryUsage: number;
  backend: string;
  model: string;
  rps: number;
  errorRate: number;
}

interface BackendInfo {
  name: string;
  type: 'vLLM' | 'Ray' | 'Triton' | 'KServe';
  status: 'healthy' | 'degraded' | 'error';
  instances: number;
  models: string[];
  utilization: number;
  lastUpdate: number;
}

/**
 * GET /api/maestro/v1/serving/metrics
 * Get serving lane metrics with backend filtering
 */
router.get('/metrics', async (req, res) => {
  try {
    const { backend, timeRange = '1h' } = req.query;

    const timeRangeMs = parseTimeRange(timeRange as string);
    const now = Date.now();
    const startTime = now - timeRangeMs;

    // Generate mock time series data
    const series = generateServingTimeSeries(startTime, now, backend as string);

    // Mock backend information
    const backends: BackendInfo[] = [
      {
        name: 'vllm-cluster-1',
        type: 'vLLM',
        status: 'healthy',
        instances: 4,
        models: ['llama-2-70b', 'code-llama-34b'],
        utilization: 67.8,
        lastUpdate: now - 30000,
      },
      {
        name: 'ray-serve-prod',
        type: 'Ray',
        status: 'healthy',
        instances: 8,
        models: ['gpt-3.5-turbo', 'claude-instant'],
        utilization: 42.1,
        lastUpdate: now - 15000,
      },
      {
        name: 'triton-inference',
        type: 'Triton',
        status: 'degraded',
        instances: 2,
        models: ['bert-base', 'roberta-large'],
        utilization: 89.3,
        lastUpdate: now - 45000,
      },
      {
        name: 'kserve-gpu',
        type: 'KServe',
        status: 'healthy',
        instances: 6,
        models: ['stable-diffusion-xl', 'whisper-large'],
        utilization: 34.7,
        lastUpdate: now - 20000,
      },
    ];

    // Filter backends if requested
    const filteredBackends =
      backend && backend !== 'all'
        ? backends.filter((b) =>
            b.name.toLowerCase().includes(backend.toString().toLowerCase()),
          )
        : backends;

    prometheusConductorMetrics?.servingMetricsRequests?.inc({
      status: 'success',
      backend: (backend as string) || 'all',
    });

    res.json({
      success: true,
      timeRange,
      backend,
      series,
      backends: filteredBackends,
      meta: {
        totalPoints: series.length,
        startTime,
        endTime: now,
        backends: filteredBackends.length,
        healthyBackends: filteredBackends.filter((b) => b.status === 'healthy')
          .length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    prometheusConductorMetrics?.servingMetricsRequests?.inc({
      status: 'error',
      backend: (req.query.backend as string) || 'all',
    });

    console.error('Serving metrics fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch serving metrics',
      code: 'SERVING_METRICS_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/maestro/v1/serving/backends
 * Get detailed backend information
 */
router.get('/backends', async (req, res) => {
  try {
    const { type } = req.query;

    const now = Date.now();
    const backends: BackendInfo[] = [
      {
        name: 'vllm-cluster-1',
        type: 'vLLM',
        status: 'healthy',
        instances: 4,
        models: ['llama-2-70b', 'code-llama-34b', 'mistral-7b'],
        utilization: 67.8,
        lastUpdate: now - 30000,
      },
      {
        name: 'vllm-cluster-2',
        type: 'vLLM',
        status: 'healthy',
        instances: 6,
        models: ['llama-2-13b', 'vicuna-33b'],
        utilization: 45.2,
        lastUpdate: now - 25000,
      },
      {
        name: 'ray-serve-prod',
        type: 'Ray',
        status: 'healthy',
        instances: 8,
        models: ['gpt-3.5-turbo', 'claude-instant', 'palm-2'],
        utilization: 42.1,
        lastUpdate: now - 15000,
      },
      {
        name: 'triton-inference-cpu',
        type: 'Triton',
        status: 'healthy',
        instances: 4,
        models: ['bert-base', 'roberta-large', 'distilbert'],
        utilization: 34.5,
        lastUpdate: now - 10000,
      },
      {
        name: 'triton-inference-gpu',
        type: 'Triton',
        status: 'degraded',
        instances: 2,
        models: ['bert-large', 'roberta-xl'],
        utilization: 89.3,
        lastUpdate: now - 45000,
      },
      {
        name: 'kserve-gpu-1',
        type: 'KServe',
        status: 'healthy',
        instances: 6,
        models: ['stable-diffusion-xl', 'whisper-large'],
        utilization: 34.7,
        lastUpdate: now - 20000,
      },
      {
        name: 'kserve-cpu',
        type: 'KServe',
        status: 'healthy',
        instances: 3,
        models: ['whisper-base', 'clip-vit'],
        utilization: 28.1,
        lastUpdate: now - 18000,
      },
    ];

    // Filter by type if requested
    const filteredBackends = type
      ? backends.filter(
          (b) => b.type.toLowerCase() === type.toString().toLowerCase(),
        )
      : backends;

    res.json({
      success: true,
      backends: filteredBackends,
      summary: {
        total: filteredBackends.length,
        healthy: filteredBackends.filter((b) => b.status === 'healthy').length,
        degraded: filteredBackends.filter((b) => b.status === 'degraded')
          .length,
        error: filteredBackends.filter((b) => b.status === 'error').length,
        totalInstances: filteredBackends.reduce(
          (sum, b) => sum + b.instances,
          0,
        ),
        totalModels: [...new Set(filteredBackends.flatMap((b) => b.models))]
          .length,
        averageUtilization:
          filteredBackends.reduce((sum, b) => sum + b.utilization, 0) /
          filteredBackends.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Backend info fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch backend information',
      code: 'BACKEND_INFO_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/maestro/v1/serving/spans
 * Get serving spans for detailed analysis
 */
router.get('/spans', async (req, res) => {
  try {
    const { backend, limit = 100, offset = 0 } = req.query;

    const spans = generateServingSpans(
      parseInt(limit as string),
      parseInt(offset as string),
      backend as string,
    );

    res.json({
      success: true,
      spans,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: 1000, // Mock total
        hasMore: parseInt(offset as string) + spans.length < 1000,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Serving spans fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch serving spans',
      code: 'SERVING_SPANS_FAILED',
      message: error.message,
    });
  }
});

// Helper functions

function parseTimeRange(timeRange: string): number {
  const timeRanges: { [key: string]: number } = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };
  return timeRanges[timeRange] || timeRanges['1h'];
}

function generateServingTimeSeries(
  startTime: number,
  endTime: number,
  backend?: string,
): ServingMetric[] {
  const series: ServingMetric[] = [];
  const interval = Math.max((endTime - startTime) / 60, 60000); // At least 1 minute intervals

  const backends = [
    'vllm-cluster-1',
    'ray-serve-prod',
    'triton-inference',
    'kserve-gpu',
  ];
  const models = [
    'llama-2-70b',
    'gpt-3.5-turbo',
    'bert-base',
    'stable-diffusion-xl',
  ];

  for (let time = startTime; time <= endTime; time += interval) {
    // Generate base metrics with some realistic patterns
    const hourOfDay = new Date(time).getHours();
    const isBusinessHours = hourOfDay >= 9 && hourOfDay <= 17;
    const loadMultiplier = isBusinessHours ? 1.5 : 0.7;

    const baseQueueDepth = Math.max(
      0,
      Math.floor((Math.random() * 20 + 5) * loadMultiplier),
    );
    const baseBatchSize = Math.floor(Math.random() * 16 + 8);
    const baseKvHit = Math.random() * 30 + 60; // 60-90% hit rate
    const baseLatency = Math.random() * 200 + 100; // 100-300ms
    const baseThroughput = Math.random() * 50 + 25; // 25-75 rps

    series.push({
      ts: time,
      qDepth: baseQueueDepth + Math.floor(Math.random() * 10 - 5),
      batch: Math.max(1, baseBatchSize + Math.floor(Math.random() * 8 - 4)),
      kvHit: Math.max(0, Math.min(100, baseKvHit + Math.random() * 20 - 10)),
      p95Latency: Math.max(50, baseLatency + Math.random() * 100 - 50),
      throughput: Math.max(0, baseThroughput + Math.random() * 20 - 10),
      utilizationCpu: Math.random() * 40 + 30, // 30-70%
      utilizationGpu: Math.random() * 50 + 40, // 40-90%
      memoryUsage: Math.random() * 1024 * 1024 * 1024 * 2, // 0-2GB
      backend: backend || backends[Math.floor(Math.random() * backends.length)],
      model: models[Math.floor(Math.random() * models.length)],
      rps: Math.max(0, baseThroughput + Math.random() * 10 - 5),
      errorRate: Math.random() * 5, // 0-5% error rate
    });
  }

  return series.sort((a, b) => a.ts - b.ts);
}

function generateServingSpans(limit: number, offset: number, backend?: string) {
  const spans = [];
  const backends = [
    'vllm-cluster-1',
    'ray-serve-prod',
    'triton-inference',
    'kserve-gpu',
  ];
  const models = [
    'llama-2-70b',
    'gpt-3.5-turbo',
    'bert-base',
    'stable-diffusion-xl',
  ];
  const operations = [
    'inference',
    'tokenize',
    'decode',
    'preprocess',
    'postprocess',
  ];

  for (let i = 0; i < limit; i++) {
    const spanId = `span-${offset + i + 1}`;
    const selectedBackend =
      backend || backends[Math.floor(Math.random() * backends.length)];
    const startTime = Date.now() - Math.random() * 3600000; // Last hour
    const duration = Math.random() * 2000 + 100; // 100-2100ms

    spans.push({
      spanId,
      traceId: `trace-${Math.floor(Math.random() * 1000)}`,
      parentId:
        Math.random() > 0.3
          ? `parent-${Math.floor(Math.random() * 100)}`
          : null,
      operationName: operations[Math.floor(Math.random() * operations.length)],
      startTime,
      duration,
      status: Math.random() > 0.05 ? 'success' : 'error', // 95% success rate
      backend: selectedBackend,
      model: models[Math.floor(Math.random() * models.length)],
      tags: {
        'service.name': selectedBackend,
        'model.name': models[Math.floor(Math.random() * models.length)],
        'request.id': `req-${Math.floor(Math.random() * 10000)}`,
        'batch.size': Math.floor(Math.random() * 16 + 1),
        'tokens.input': Math.floor(Math.random() * 2000 + 100),
        'tokens.output': Math.floor(Math.random() * 1000 + 50),
      },
      logs: [
        {
          timestamp: startTime + 10,
          level: 'info',
          message: 'Request received',
        },
        {
          timestamp: startTime + duration - 10,
          level: 'info',
          message: 'Request completed',
        },
      ],
    });
  }

  return spans.sort((a, b) => b.startTime - a.startTime);
}

export { router as servingRoutes };
