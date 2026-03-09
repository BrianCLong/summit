import express from 'express';
import { z } from 'zod';
import { QualityEvaluationPlatform } from '../quality-evaluation/evaluation-platform.js';
import { otelService } from '../middleware/observability/otel-tracing.js';

const router = express.Router();
const qualityPlatform = new QualityEvaluationPlatform();

// Validation schemas
const SLOSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  metricType: z.enum([
    'accuracy',
    'relevance',
    'coherence',
    'toxicity',
    'bias',
    'hallucination',
    'latency',
    'cost',
  ]),
  threshold: z.number().min(0).max(1),
  operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
  timeWindow: z.number().min(1).max(10080),
  evaluationMethod: z.enum(['automated', 'human', 'hybrid']),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
});

const SingleEvaluationSchema = z.object({
  modelId: z.string().min(1),
  inputText: z.string().min(1),
  outputText: z.string().min(1),
  groundTruth: z.string().optional(),
  evaluationTypes: z
    .array(z.string())
    .default(['accuracy', 'relevance', 'coherence']),
  metadata: z
    .object({
      latencyMs: z.number().optional(),
      costUSD: z.number().optional(),
      targetLatencyMs: z.number().optional(),
      targetCostUSD: z.number().optional(),
      expectedAccuracy: z.number().optional(),
    })
    .optional(),
});

const BatchEvaluationSchema = z.object({
  modelId: z.string().min(1),
  dataset: z.array(
    z.object({
      input: z.string(),
      output: z.string(),
      groundTruth: z.string().optional(),
      metadata: z.object({}).passthrough().optional(),
    }),
  ),
  evaluationTypes: z
    .array(z.string())
    .default(['accuracy', 'relevance', 'coherence']),
  sloIds: z.array(z.string()).optional(),
});

/**
 * POST /api/quality-evaluation/slos
 * Create a new Semantic SLO (Service Level Objective)
 */
router.post('/slos', async (req, res) => {
  const span = otelService.createSpan('quality-evaluation.create-slo');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const validatedSLO = SLOSchema.parse(req.body);

    const sloId = await qualityPlatform.createSemanticSLO(
      tenantId,
      validatedSLO,
    );

    res.json({
      success: true,
      sloId,
      message: 'Semantic SLO created successfully',
      slo: validatedSLO,
    });

    otelService.addSpanAttributes({
      'quality-evaluation.tenant_id': tenantId,
      'quality-evaluation.slo_id': sloId,
      'quality-evaluation.metric_type': validatedSLO.metricType,
      'quality-evaluation.criticality': validatedSLO.criticality,
    });
  } catch (error: any) {
    console.error('SLO creation failed:', error);
    otelService.recordException(error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Invalid SLO configuration',
        details: error.errors,
        example: {
          name: 'Response Accuracy SLO',
          description: 'Ensure model responses maintain high accuracy',
          metricType: 'accuracy',
          threshold: 0.85,
          operator: 'gte',
          timeWindow: 60,
          evaluationMethod: 'automated',
          criticality: 'high',
        },
      });
    } else {
      res.status(500).json({
        error: 'SLO creation failed',
        message: error.message,
      });
    }
  } finally {
    span?.end();
  }
});

/**
 * POST /api/quality-evaluation/evaluate-single
 * Evaluate a single model response against quality metrics
 */
router.post('/evaluate-single', async (req, res) => {
  const span = otelService.createSpan('quality-evaluation.evaluate-single');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const validatedRequest = SingleEvaluationSchema.parse(req.body);

    const result = await qualityPlatform.evaluateSingle(
      tenantId,
      validatedRequest,
    );

    res.json({
      success: true,
      evaluation: result,
      summary: {
        overallScore:
          Object.values(result.metrics).reduce((sum, val) => sum + val, 0) /
          Object.keys(result.metrics).length,
        sloViolations: result.sloViolations.length,
        metricsEvaluated: Object.keys(result.metrics).length,
      },
    });

    otelService.addSpanAttributes({
      'quality-evaluation.tenant_id': tenantId,
      'quality-evaluation.model_id': validatedRequest.modelId,
      'quality-evaluation.metrics_count': Object.keys(result.metrics).length,
      'quality-evaluation.slo_violations': result.sloViolations.length,
    });
  } catch (error: any) {
    console.error('Single evaluation failed:', error);
    otelService.recordException(error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Invalid evaluation request',
        details: error.errors,
        example: {
          modelId: 'gpt-4-turbo',
          inputText: 'What is the capital of France?',
          outputText: 'The capital of France is Paris.',
          groundTruth: 'Paris',
          evaluationTypes: ['accuracy', 'relevance', 'coherence'],
          metadata: {
            latencyMs: 800,
            costUSD: 0.002,
          },
        },
      });
    } else {
      res.status(500).json({
        error: 'Evaluation failed',
        message: error.message,
      });
    }
  } finally {
    span?.end();
  }
});

/**
 * POST /api/quality-evaluation/evaluate-batch
 * Evaluate a batch of model responses for comprehensive analysis
 */
router.post('/evaluate-batch', async (req, res) => {
  const span = otelService.createSpan('quality-evaluation.evaluate-batch');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const validatedRequest = BatchEvaluationSchema.parse(req.body);

    const result = await qualityPlatform.evaluateBatch(
      tenantId,
      validatedRequest,
    );

    res.json({
      success: true,
      batchEvaluation: result,
      insights: {
        totalEvaluated: result.results.length,
        averageOverallScore: result.summary.averageScores
          ? (Object.values(result.summary.averageScores).reduce(
              (sum: number, val: any) => sum + (val as number),
              0,
            ) as number) / Object.keys(result.summary.averageScores).length
          : 0,
        sloComplianceRate: result.summary.sloComplianceRate,
        regressionDetected: result.summary.regressionDetected,
      },
    });

    otelService.addSpanAttributes({
      'quality-evaluation.tenant_id': tenantId,
      'quality-evaluation.model_id': validatedRequest.modelId,
      'quality-evaluation.batch_size': validatedRequest.dataset.length,
      'quality-evaluation.regression_detected':
        result.summary.regressionDetected,
    });
  } catch (error: any) {
    console.error('Batch evaluation failed:', error);
    otelService.recordException(error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Invalid batch evaluation request',
        details: error.errors,
        example: {
          modelId: 'claude-3-sonnet',
          dataset: [
            {
              input: 'Explain quantum computing',
              output: 'Quantum computing uses quantum mechanics...',
              groundTruth: 'Quantum computing is a type of computation...',
              metadata: { topic: 'technology' },
            },
          ],
          evaluationTypes: ['accuracy', 'relevance', 'coherence', 'toxicity'],
          sloIds: ['slo-accuracy-001'],
        },
      });
    } else {
      res.status(500).json({
        error: 'Batch evaluation failed',
        message: error.message,
      });
    }
  } finally {
    span?.end();
  }
});

/**
 * GET /api/quality-evaluation/reports/:modelId
 * Generate comprehensive quality report for a model
 */
router.get('/reports/:modelId', async (req, res) => {
  const span = otelService.createSpan('quality-evaluation.generate-report');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
    const { modelId } = req.params;
    const timeRangeHours = parseInt(req.query.timeRangeHours as string) || 24;

    const report = await qualityPlatform.generateQualityReport(
      tenantId,
      modelId,
      timeRangeHours,
    );

    res.json({
      report,
      insights: {
        qualityTrend:
          report.overallScore > 0.8
            ? 'excellent'
            : report.overallScore > 0.6
              ? 'good'
              : report.overallScore > 0.4
                ? 'needs_improvement'
                : 'poor',
        sloStatus:
          report.sloCompliance > 0.95
            ? 'compliant'
            : report.sloCompliance > 0.9
              ? 'mostly_compliant'
              : 'non_compliant',
        actionRequired: report.regressionDetected || report.sloCompliance < 0.9,
      },
    });

    otelService.addSpanAttributes({
      'quality-evaluation.tenant_id': tenantId,
      'quality-evaluation.model_id': modelId,
      'quality-evaluation.overall_score': report.overallScore,
      'quality-evaluation.slo_compliance': report.sloCompliance,
      'quality-evaluation.regression_detected': report.regressionDetected,
    });
  } catch (error: any) {
    console.error('Report generation failed:', error);
    otelService.recordException(error);
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message,
    });
  } finally {
    span?.end();
  }
});

/**
 * GET /api/quality-evaluation/slo-dashboard
 * Get SLO dashboard with health metrics and violations
 */
router.get('/slo-dashboard', async (req, res) => {
  const span = otelService.createSpan('quality-evaluation.slo-dashboard');

  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';

    const dashboard = await qualityPlatform.getSLODashboard(tenantId);

    res.json({
      dashboard,
      status: dashboard.health?.overallHealth || 'unknown',
      alerts: {
        critical:
          dashboard.recentViolations?.filter((v: any) =>
            JSON.parse(v.slo_violations).some(
              (sloId: string) =>
                dashboard.slos?.find((slo: any) => slo.id === sloId)
                  ?.criticality === 'critical',
            ),
          ).length || 0,
        warnings: dashboard.recentViolations?.length || 0,
      },
    });

    otelService.addSpanAttributes({
      'quality-evaluation.tenant_id': tenantId,
      'quality-evaluation.total_slos': dashboard.summary?.totalSLOs || 0,
      'quality-evaluation.recent_violations':
        dashboard.summary?.recentViolations || 0,
      'quality-evaluation.overall_health':
        dashboard.health?.overallHealth || 'unknown',
    });
  } catch (error: any) {
    console.error('SLO dashboard failed:', error);
    otelService.recordException(error);
    res.status(500).json({
      error: 'Dashboard generation failed',
      message: error.message,
    });
  } finally {
    span?.end();
  }
});

/**
 * GET /api/quality-evaluation/metrics/supported
 * Get list of supported evaluation metrics and their descriptions
 */
router.get('/metrics/supported', async (req, res) => {
  const span = otelService.createSpan('quality-evaluation.supported-metrics');

  try {
    const supportedMetrics = {
      accuracy: {
        description:
          'Semantic accuracy against ground truth using similarity measures',
        range: [0, 1],
        higherIsBetter: true,
        evaluationType: 'automated',
        requiresGroundTruth: true,
      },
      relevance: {
        description: 'Contextual relevance of response to input query',
        range: [0, 1],
        higherIsBetter: true,
        evaluationType: 'automated',
        requiresGroundTruth: false,
      },
      coherence: {
        description: 'Logical coherence and flow of the response',
        range: [0, 1],
        higherIsBetter: true,
        evaluationType: 'automated',
        requiresGroundTruth: false,
      },
      toxicity: {
        description: 'Content safety and toxicity detection (inverted scale)',
        range: [0, 1],
        higherIsBetter: true,
        evaluationType: 'automated',
        requiresGroundTruth: false,
      },
      bias: {
        description: 'Bias detection across demographic categories',
        range: [0, 1],
        higherIsBetter: true,
        evaluationType: 'automated',
        requiresGroundTruth: false,
      },
      hallucination: {
        description: 'Factual accuracy and hallucination detection',
        range: [0, 1],
        higherIsBetter: true,
        evaluationType: 'automated',
        requiresGroundTruth: false,
      },
      latency: {
        description: 'Response time performance evaluation',
        range: [0, 1],
        higherIsBetter: true,
        evaluationType: 'automated',
        requiresGroundTruth: false,
        requiresMetadata: ['latencyMs', 'targetLatencyMs'],
      },
      cost: {
        description: 'Cost per inference evaluation',
        range: [0, 1],
        higherIsBetter: true,
        evaluationType: 'automated',
        requiresGroundTruth: false,
        requiresMetadata: ['costUSD', 'targetCostUSD'],
      },
    };

    res.json({
      supportedMetrics,
      totalMetrics: Object.keys(supportedMetrics).length,
      evaluationMethods: ['automated', 'human', 'hybrid'],
      operators: ['gt', 'gte', 'lt', 'lte', 'eq'],
      criticality: ['low', 'medium', 'high', 'critical'],
    });
  } catch (error: any) {
    console.error('Supported metrics query failed:', error);
    res.status(500).json({
      error: 'Metrics query failed',
      message: error.message,
    });
  } finally {
    span?.end();
  }
});

/**
 * GET /api/quality-evaluation/health
 * Quality evaluation platform health check
 */
router.get('/health', async (req, res) => {
  const span = otelService.createSpan('quality-evaluation.health');

  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        evaluationEngine: 'operational',
        sloManagement: 'operational',
        reportGeneration: 'operational',
        alerting: 'operational',
      },
      supportedMetrics: 8,
      supportedMethods: ['automated', 'human', 'hybrid'],
      version: '1.0.0',
      capabilities: {
        singleEvaluation: true,
        batchEvaluation: true,
        semanticSLOs: true,
        regressionDetection: true,
        realTimeAlerting: true,
        customMetrics: false, // Future feature
      },
    };

    res.json(health);
  } catch (error: any) {
    console.error('Quality evaluation health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    span?.end();
  }
});

/**
 * GET /api/quality-evaluation/benchmarks
 * Get recommended SLO thresholds and industry benchmarks
 */
router.get('/benchmarks', async (req, res) => {
  const span = otelService.createSpan('quality-evaluation.benchmarks');

  try {
    const benchmarks = {
      industry: {
        chatbots: {
          accuracy: { min: 0.8, target: 0.9, excellent: 0.95 },
          relevance: { min: 0.75, target: 0.85, excellent: 0.95 },
          coherence: { min: 0.8, target: 0.9, excellent: 0.95 },
          toxicity: { min: 0.95, target: 0.98, excellent: 0.99 },
          latency: { min: 0.7, target: 0.85, excellent: 0.95 },
        },
        'content-generation': {
          accuracy: { min: 0.7, target: 0.85, excellent: 0.9 },
          relevance: { min: 0.8, target: 0.9, excellent: 0.95 },
          coherence: { min: 0.85, target: 0.92, excellent: 0.97 },
          bias: { min: 0.8, target: 0.9, excellent: 0.95 },
          toxicity: { min: 0.9, target: 0.95, excellent: 0.99 },
        },
        'code-generation': {
          accuracy: { min: 0.6, target: 0.8, excellent: 0.9 },
          relevance: { min: 0.7, target: 0.85, excellent: 0.9 },
          coherence: { min: 0.75, target: 0.85, excellent: 0.9 },
          hallucination: { min: 0.8, target: 0.9, excellent: 0.95 },
        },
        'qa-systems': {
          accuracy: { min: 0.85, target: 0.92, excellent: 0.97 },
          relevance: { min: 0.9, target: 0.95, excellent: 0.98 },
          hallucination: { min: 0.85, target: 0.92, excellent: 0.97 },
          latency: { min: 0.8, target: 0.9, excellent: 0.95 },
        },
      },
      recommended_slos: {
        'high-stakes': {
          accuracy: {
            threshold: 0.95,
            operator: 'gte',
            criticality: 'critical',
          },
          toxicity: {
            threshold: 0.98,
            operator: 'gte',
            criticality: 'critical',
          },
          bias: { threshold: 0.9, operator: 'gte', criticality: 'high' },
        },
        'general-purpose': {
          accuracy: { threshold: 0.85, operator: 'gte', criticality: 'high' },
          relevance: { threshold: 0.8, operator: 'gte', criticality: 'medium' },
          coherence: { threshold: 0.8, operator: 'gte', criticality: 'medium' },
          toxicity: { threshold: 0.95, operator: 'gte', criticality: 'high' },
        },
        'performance-critical': {
          latency: { threshold: 0.9, operator: 'gte', criticality: 'high' },
          cost: { threshold: 0.8, operator: 'gte', criticality: 'medium' },
          accuracy: { threshold: 0.8, operator: 'gte', criticality: 'high' },
        },
      },
      time_windows: {
        'real-time': 1, // 1 minute
        'short-term': 15, // 15 minutes
        'medium-term': 60, // 1 hour
        'long-term': 1440, // 24 hours
      },
    };

    res.json({
      benchmarks,
      note: 'These benchmarks are based on industry standards and may need adjustment based on your specific use case',
      lastUpdated: '2024-01-15',
    });
  } catch (error: any) {
    console.error('Benchmarks query failed:', error);
    res.status(500).json({
      error: 'Benchmarks query failed',
      message: error.message,
    });
  } finally {
    span?.end();
  }
});

export { router as qualityEvaluationRouter };
