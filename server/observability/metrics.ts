import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { metrics } from '@opentelemetry/api';
import { logger } from '../utils/logger';

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'maestro-conductor-v03',
    [SemanticResourceAttributes.SERVICE_VERSION]:
      process.env.npm_package_version || '0.3.0',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'intelgraph',
  }),
  traceExporter: new JaegerExporter({
    endpoint:
      process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          return req.url?.includes('/health') || req.url?.includes('/metrics');
        },
      },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
    }),
  ],
});

// Initialize SDK
sdk.start();
logger.info('OpenTelemetry initialized');

// Custom metrics
const meter = metrics.getMeter('maestro-conductor', '0.3.0');

export const maestroMetrics = {
  // Agent task metrics
  taskStarted: meter.createCounter('maestro_tasks_started_total', {
    description: 'Total number of agent tasks started',
  }),

  taskCompleted: meter.createCounter('maestro_tasks_completed_total', {
    description: 'Total number of agent tasks completed',
  }),

  taskFailed: meter.createCounter('maestro_tasks_failed_total', {
    description: 'Total number of agent tasks failed',
  }),

  taskDuration: meter.createHistogram('maestro_task_duration_seconds', {
    description: 'Duration of agent tasks in seconds',
    boundaries: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300],
  }),

  // LLM cost tracking
  llmCost: meter.createHistogram('maestro_llm_cost_usd', {
    description: 'LLM API cost in USD',
    boundaries: [0.001, 0.01, 0.1, 1, 5, 10, 25, 50, 100],
  }),

  llmTokens: meter.createCounter('maestro_llm_tokens_total', {
    description: 'Total LLM tokens consumed',
  }),

  // PR metrics
  prProcessed: meter.createCounter('maestro_prs_processed_total', {
    description: 'Total PRs processed by Maestro',
  }),

  prLeadTime: meter.createHistogram('maestro_pr_lead_time_hours', {
    description: 'PR lead time from open to merge in hours',
    boundaries: [0.5, 1, 2, 4, 8, 16, 24, 48, 72, 168],
  }),

  // CI/CD metrics
  pipelineDuration: meter.createHistogram('maestro_pipeline_duration_seconds', {
    description: 'CI pipeline duration in seconds',
    boundaries: [30, 60, 120, 300, 600, 900, 1800, 3600],
  }),

  buildCacheHit: meter.createCounter('maestro_build_cache_hits_total', {
    description: 'Build cache hits',
  }),

  buildCacheMiss: meter.createCounter('maestro_build_cache_misses_total', {
    description: 'Build cache misses',
  }),

  // Test metrics
  testsRun: meter.createCounter('maestro_tests_run_total', {
    description: 'Total tests executed',
  }),

  testsPassed: meter.createCounter('maestro_tests_passed_total', {
    description: 'Total tests passed',
  }),

  testsFailed: meter.createCounter('maestro_tests_failed_total', {
    description: 'Total tests failed',
  }),

  testFlakes: meter.createCounter('maestro_test_flakes_total', {
    description: 'Total test flakes detected',
  }),

  // Security metrics
  securityIssues: meter.createCounter('maestro_security_issues_total', {
    description: 'Security issues detected',
  }),

  vulnerabilitiesFound: meter.createCounter('maestro_vulnerabilities_total', {
    description: 'Vulnerabilities found in dependencies',
  }),

  // Policy metrics
  policyViolations: meter.createCounter('maestro_policy_violations_total', {
    description: 'Policy violations detected',
  }),

  policyBlocks: meter.createCounter('maestro_policy_blocks_total', {
    description: 'Tasks blocked by policy',
  }),

  // Queue metrics
  queueSize: meter.createUpDownCounter('maestro_queue_size', {
    description: 'Current queue size',
  }),

  queueWaitTime: meter.createHistogram('maestro_queue_wait_seconds', {
    description: 'Time jobs wait in queue',
    boundaries: [1, 5, 10, 30, 60, 300, 600, 1800],
  }),

  // DORA metrics
  deploymentFrequency: meter.createCounter('maestro_deployments_total', {
    description: 'Total deployments',
  }),

  changeFailureRate: meter.createHistogram('maestro_change_failure_rate', {
    description: 'Percentage of deployments causing failures',
    boundaries: [0, 5, 10, 15, 20, 25, 50, 75, 100],
  }),

  recoveryTime: meter.createHistogram('maestro_mttr_hours', {
    description: 'Mean time to recovery in hours',
    boundaries: [0.5, 1, 2, 4, 8, 24, 48, 168],
  }),
};

// Convenience functions for common metric recording patterns
export const recordTaskMetrics = (
  taskKind: string,
  status: 'started' | 'completed' | 'failed',
  durationSeconds?: number,
  cost?: number,
) => {
  const labels = { task_kind: taskKind };

  switch (status) {
    case 'started':
      maestroMetrics.taskStarted.add(1, labels);
      break;
    case 'completed':
      maestroMetrics.taskCompleted.add(1, labels);
      if (durationSeconds !== undefined) {
        maestroMetrics.taskDuration.record(durationSeconds, labels);
      }
      if (cost !== undefined) {
        maestroMetrics.llmCost.record(cost, labels);
      }
      break;
    case 'failed':
      maestroMetrics.taskFailed.add(1, labels);
      if (durationSeconds !== undefined) {
        maestroMetrics.taskDuration.record(durationSeconds, labels);
      }
      break;
  }
};

export const recordPRMetrics = (
  prNumber: number,
  leadTimeHours?: number,
  status?: 'opened' | 'merged' | 'closed',
) => {
  const labels = { pr: prNumber.toString() };

  if (status) {
    maestroMetrics.prProcessed.add(1, { ...labels, status });
  }

  if (leadTimeHours !== undefined) {
    maestroMetrics.prLeadTime.record(leadTimeHours, labels);
  }
};

export const recordTestMetrics = (
  testsRun: number,
  testsPassed: number,
  testsFailed: number,
  flakes: number = 0,
  suite?: string,
) => {
  const labels = suite ? { suite } : {};

  maestroMetrics.testsRun.add(testsRun, labels);
  maestroMetrics.testsPassed.add(testsPassed, labels);
  maestroMetrics.testsFailed.add(testsFailed, labels);

  if (flakes > 0) {
    maestroMetrics.testFlakes.add(flakes, labels);
  }
};

export const recordSecurityMetrics = (
  issuesFound: number,
  vulnerabilities: number,
  severity?: 'low' | 'medium' | 'high' | 'critical',
) => {
  const labels = severity ? { severity } : {};

  maestroMetrics.securityIssues.add(issuesFound, labels);
  maestroMetrics.vulnerabilitiesFound.add(vulnerabilities, labels);
};

export const recordPolicyMetrics = (
  violations: number,
  blocks: number,
  policyName?: string,
) => {
  const labels = policyName ? { policy: policyName } : {};

  maestroMetrics.policyViolations.add(violations, labels);
  maestroMetrics.policyBlocks.add(blocks, labels);
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    logger.info('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    logger.error('Error shutting down OpenTelemetry SDK', error);
  }
});

export { sdk };
