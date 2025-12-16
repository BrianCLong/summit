/**
 * CompanyOS Observability SDK - SLO Module
 *
 * Provides SLO definition, error budget calculation, and burn rate
 * alerting following Google SRE multi-window, multi-burn-rate methodology.
 */

import type {
  SloDefinition,
  SloType,
  ErrorBudget,
  ServiceArchetype,
} from '../types/index.js';

// =============================================================================
// SLO CONFIGURATION
// =============================================================================

/**
 * Default SLO targets by service archetype
 */
export const DEFAULT_SLO_TARGETS: Record<
  ServiceArchetype,
  { availability: number; latency_p99_ms: number; latency_p95_ms: number }
> = {
  'api-service': {
    availability: 99.9,
    latency_p99_ms: 500,
    latency_p95_ms: 200,
  },
  'gateway-service': {
    availability: 99.95,
    latency_p99_ms: 100,
    latency_p95_ms: 50,
  },
  'worker-service': {
    availability: 99.5,
    latency_p99_ms: 300000, // 5 minutes
    latency_p95_ms: 60000, // 1 minute
  },
  'data-pipeline': {
    availability: 99.0,
    latency_p99_ms: 600000, // 10 minutes
    latency_p95_ms: 300000, // 5 minutes
  },
  'storage-service': {
    availability: 99.99,
    latency_p99_ms: 100,
    latency_p95_ms: 50,
  },
  'ml-service': {
    availability: 99.5,
    latency_p99_ms: 5000,
    latency_p95_ms: 2000,
  },
};

/**
 * Multi-window burn rate thresholds (Google SRE methodology)
 */
export const BURN_RATE_WINDOWS = {
  /** Page immediately: 5% of budget in 1 hour */
  critical: {
    longWindow: '1h',
    shortWindow: '5m',
    burnRate: 14.4,
    severity: 'critical' as const,
    description: 'Exhausts 30-day budget in ~2 days',
  },
  /** Page during business hours: 5% of budget in 6 hours */
  high: {
    longWindow: '6h',
    shortWindow: '30m',
    burnRate: 6,
    severity: 'warning' as const,
    description: 'Exhausts 30-day budget in ~5 days',
  },
  /** Create ticket: 10% of budget in 3 days */
  medium: {
    longWindow: '3d',
    shortWindow: '6h',
    burnRate: 1,
    severity: 'warning' as const,
    description: 'Exhausts 30-day budget in ~30 days',
  },
  /** Informational: slow burn */
  low: {
    longWindow: '7d',
    shortWindow: '1d',
    burnRate: 0.5,
    severity: 'info' as const,
    description: 'Slow degradation, review weekly',
  },
};

// =============================================================================
// SLO DEFINITION BUILDERS
// =============================================================================

/**
 * Create an availability SLO definition
 */
export function createAvailabilitySlo(
  serviceName: string,
  target: number = 99.9,
  window: number = 30
): SloDefinition {
  return {
    name: `${serviceName}_availability`,
    type: 'availability',
    target,
    window,
    description: `${target}% of requests should succeed (non-5xx) over ${window} days`,
    sli: {
      good: `sum(rate(http_requests_total{service="${serviceName}",status_code!~"5.."}[5m]))`,
      total: `sum(rate(http_requests_total{service="${serviceName}"}[5m]))`,
    },
    alerts: [
      { burnRate: 14.4, severity: 'critical', window: '1h' },
      { burnRate: 6, severity: 'warning', window: '6h' },
      { burnRate: 1, severity: 'warning', window: '3d' },
    ],
  };
}

/**
 * Create a latency SLO definition
 */
export function createLatencySlo(
  serviceName: string,
  thresholdMs: number,
  percentile: number = 99,
  target: number = 99,
  window: number = 30
): SloDefinition {
  const thresholdSeconds = thresholdMs / 1000;
  return {
    name: `${serviceName}_latency_p${percentile}`,
    type: 'latency',
    target,
    window,
    description: `${target}% of requests should complete within ${thresholdMs}ms (p${percentile}) over ${window} days`,
    sli: {
      good: `sum(rate(http_request_duration_seconds_bucket{service="${serviceName}",le="${thresholdSeconds}"}[5m]))`,
      total: `sum(rate(http_request_duration_seconds_count{service="${serviceName}"}[5m]))`,
    },
    alerts: [
      { burnRate: 14.4, severity: 'critical', window: '1h' },
      { burnRate: 6, severity: 'warning', window: '6h' },
    ],
  };
}

/**
 * Create a throughput SLO definition
 */
export function createThroughputSlo(
  serviceName: string,
  minRequestsPerSecond: number,
  target: number = 99,
  window: number = 30
): SloDefinition {
  return {
    name: `${serviceName}_throughput`,
    type: 'throughput',
    target,
    window,
    description: `${target}% of time should handle >= ${minRequestsPerSecond} req/s over ${window} days`,
    sli: {
      good: `sum(rate(http_requests_total{service="${serviceName}"}[5m])) >= ${minRequestsPerSecond}`,
      total: '1', // Boolean SLI
    },
    alerts: [
      { burnRate: 6, severity: 'warning', window: '1h' },
    ],
  };
}

/**
 * Create SLOs for a worker/queue service
 */
export function createWorkerSlos(
  serviceName: string,
  queueName: string,
  targets: { availability: number; maxDurationMs: number } = {
    availability: 99.5,
    maxDurationMs: 300000,
  }
): SloDefinition[] {
  return [
    {
      name: `${serviceName}_job_success`,
      type: 'availability',
      target: targets.availability,
      window: 30,
      description: `${targets.availability}% of jobs should complete successfully`,
      sli: {
        good: `sum(rate(jobs_processed_total{service="${serviceName}",queue="${queueName}",status="completed"}[5m]))`,
        total: `sum(rate(jobs_processed_total{service="${serviceName}",queue="${queueName}"}[5m]))`,
      },
      alerts: [
        { burnRate: 14.4, severity: 'critical', window: '1h' },
        { burnRate: 6, severity: 'warning', window: '6h' },
      ],
    },
    {
      name: `${serviceName}_job_duration`,
      type: 'latency',
      target: 99,
      window: 30,
      description: `99% of jobs should complete within ${targets.maxDurationMs}ms`,
      sli: {
        good: `sum(rate(job_duration_seconds_bucket{service="${serviceName}",queue="${queueName}",le="${targets.maxDurationMs / 1000}"}[5m]))`,
        total: `sum(rate(job_duration_seconds_count{service="${serviceName}",queue="${queueName}"}[5m]))`,
      },
      alerts: [
        { burnRate: 6, severity: 'warning', window: '6h' },
      ],
    },
  ];
}

// =============================================================================
// ERROR BUDGET CALCULATIONS
// =============================================================================

/**
 * Calculate error budget status
 */
export function calculateErrorBudget(
  sloTarget: number,
  windowDays: number,
  currentSuccessRate: number,
  elapsedDays: number
): ErrorBudget {
  const totalBudget = 100 - sloTarget; // e.g., 0.1% for 99.9% SLO
  const currentErrorRate = 100 - currentSuccessRate;

  // Calculate consumed budget based on elapsed time
  const expectedBudgetUsed = (elapsedDays / windowDays) * totalBudget;
  const actualBudgetUsed = currentErrorRate;

  // Burn rate = actual error rate / allowed error rate
  const allowedErrorRate = totalBudget / windowDays; // per day
  const currentBurnRate = currentErrorRate / allowedErrorRate;

  const remaining = Math.max(0, totalBudget - actualBudgetUsed);
  const consumed = totalBudget - remaining;
  const windowRemaining = (windowDays - elapsedDays) * 24 * 60 * 60;

  let status: ErrorBudget['status'];
  if (remaining <= 0) {
    status = 'exhausted';
  } else if (currentBurnRate >= 6) {
    status = 'critical';
  } else if (currentBurnRate >= 1) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  return {
    total: totalBudget,
    remaining,
    consumed,
    windowRemaining,
    burnRate: currentBurnRate,
    status,
  };
}

/**
 * Calculate time until error budget exhaustion at current burn rate
 */
export function timeToExhaustion(
  sloTarget: number,
  windowDays: number,
  currentBurnRate: number
): { hours: number; humanReadable: string } {
  const totalBudgetHours = windowDays * 24;
  const hoursToExhaustion = totalBudgetHours / currentBurnRate;

  let humanReadable: string;
  if (hoursToExhaustion < 1) {
    humanReadable = `${Math.round(hoursToExhaustion * 60)} minutes`;
  } else if (hoursToExhaustion < 24) {
    humanReadable = `${Math.round(hoursToExhaustion)} hours`;
  } else {
    humanReadable = `${Math.round(hoursToExhaustion / 24)} days`;
  }

  return { hours: hoursToExhaustion, humanReadable };
}

// =============================================================================
// PROMETHEUS RULE GENERATION
// =============================================================================

/**
 * Generate Prometheus recording rules for an SLO
 */
export function generateRecordingRules(slo: SloDefinition): string {
  const rules: string[] = [];
  const safeName = slo.name.replace(/[^a-zA-Z0-9_]/g, '_');

  // SLI recording rule
  rules.push(`
- record: slo:${safeName}:sli
  expr: |
    (${slo.sli.good})
    /
    (${slo.sli.total})
`);

  // Error rate recording rules for different windows
  const windows = ['5m', '30m', '1h', '6h', '1d', '3d'];
  for (const window of windows) {
    rules.push(`
- record: slo:${safeName}:error_rate:${window}
  expr: |
    1 - (
      sum(increase(${slo.sli.good.replace('[5m]', `[${window}]`)}))
      /
      sum(increase(${slo.sli.total.replace('[5m]', `[${window}]`)}))
    )
`);
  }

  return rules.join('\n');
}

/**
 * Generate Prometheus alerting rules for an SLO
 */
export function generateAlertRules(slo: SloDefinition): string {
  const rules: string[] = [];
  const safeName = slo.name.replace(/[^a-zA-Z0-9_]/g, '_');
  const errorBudget = (100 - slo.target) / 100;

  for (const alert of slo.alerts || []) {
    const alertName = `${safeName}_burn_rate_${alert.severity}`;
    const threshold = errorBudget * alert.burnRate;

    rules.push(`
- alert: ${alertName}
  expr: |
    slo:${safeName}:error_rate:${alert.window} > ${threshold}
  for: 5m
  labels:
    severity: ${alert.severity}
    slo: ${slo.name}
  annotations:
    summary: "SLO ${slo.name} burn rate is ${alert.burnRate}x"
    description: "Error budget is being consumed at ${alert.burnRate}x the sustainable rate. At this rate, the budget will be exhausted before the window ends."
    runbook_url: "https://runbooks.companyos.dev/slo/${safeName}"
`);
  }

  return rules.join('\n');
}

// =============================================================================
// SLO TEMPLATE GENERATION
// =============================================================================

/**
 * Generate a complete SLO configuration for a service archetype
 */
export function generateSloConfig(
  serviceName: string,
  archetype: ServiceArchetype
): { slos: SloDefinition[]; prometheusRules: string } {
  const targets = DEFAULT_SLO_TARGETS[archetype];
  const slos: SloDefinition[] = [];

  // Availability SLO (all archetypes)
  slos.push(createAvailabilitySlo(serviceName, targets.availability));

  // Latency SLO (API and gateway services)
  if (['api-service', 'gateway-service', 'storage-service', 'ml-service'].includes(archetype)) {
    slos.push(createLatencySlo(serviceName, targets.latency_p99_ms, 99));
    slos.push(createLatencySlo(serviceName, targets.latency_p95_ms, 95));
  }

  // Worker-specific SLOs
  if (archetype === 'worker-service' || archetype === 'data-pipeline') {
    slos.push(...createWorkerSlos(serviceName, 'default', {
      availability: targets.availability,
      maxDurationMs: targets.latency_p99_ms,
    }));
  }

  // Generate Prometheus rules
  const recordingRules = slos.map(generateRecordingRules).join('\n');
  const alertRules = slos.map(generateAlertRules).join('\n');

  const prometheusRules = `
groups:
  - name: ${serviceName}.slo.recording
    rules:
${recordingRules}

  - name: ${serviceName}.slo.alerts
    rules:
${alertRules}
`;

  return { slos, prometheusRules };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { SloDefinition, SloType, ErrorBudget };
