/**
 * Chaos Engineering Configuration
 *
 * Configuration types and defaults for chaos engineering experiments.
 * Defines injection types, probabilities, and safety limits.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.3 (Incident Response Testing)
 *
 * @module chaos/ChaosConfig
 */

// ============================================================================
// Types
// ============================================================================

export type ChaosInjectorType =
  | 'latency'
  | 'failure'
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'network_partition'
  | 'packet_loss'
  | 'dns_failure'
  | 'timeout'
  | 'exception'
  | 'region_kill';

export interface LatencyConfig {
  /** Minimum latency to inject in ms */
  minMs: number;
  /** Maximum latency to inject in ms */
  maxMs: number;
  /** Distribution type */
  distribution: 'uniform' | 'normal' | 'exponential';
}

export interface FailureConfig {
  /** HTTP status code to return */
  statusCode: number;
  /** Error message */
  message: string;
  /** Error type/name */
  errorType: string;
}

export interface ResourceConfig {
  /** Duration of resource stress in ms */
  durationMs: number;
  /** Intensity (0-1) */
  intensity: number;
}

export interface NetworkConfig {
  /** Affected endpoints/services */
  targets: string[];
  /** Duration in ms */
  durationMs: number;
  /** Packet loss percentage (0-100) */
  packetLossPercent?: number;
}

export interface ChaosExperiment {
  /** Unique experiment ID */
  id: string;
  /** Experiment name */
  name: string;
  /** Injector type */
  type: ChaosInjectorType;
  /** Target selector (route patterns, service names) */
  targets: string[];
  /** Probability of injection (0-1) */
  probability: number;
  /** Configuration specific to injector type */
  config: LatencyConfig | FailureConfig | ResourceConfig | NetworkConfig;
  /** Whether experiment is active */
  enabled: boolean;
  /** Tenant scope (null = all tenants) */
  tenantId: string | null;
  /** Start time */
  startTime?: Date;
  /** End time (null = indefinite) */
  endTime?: Date | null;
  /** Maximum injection count */
  maxInjections?: number;
  /** Current injection count */
  injectionCount: number;
}

export interface ChaosGlobalConfig {
  /** Master kill switch - disables all chaos */
  enabled: boolean;
  /** Environment restrictions */
  allowedEnvironments: string[];
  /** Require explicit tenant opt-in */
  requireTenantOptIn: boolean;
  /** Maximum concurrent experiments */
  maxConcurrentExperiments: number;
  /** Maximum probability allowed */
  maxProbability: number;
  /** Endpoints protected from chaos */
  protectedEndpoints: string[];
  /** Default experiment duration limit in ms */
  defaultDurationLimitMs: number;
  /** Audit all injections */
  auditInjections: boolean;
  /** Alert threshold for injection rate */
  alertThresholdPerMinute: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_GLOBAL_CONFIG: ChaosGlobalConfig = {
  enabled: false, // Disabled by default - must be explicitly enabled
  allowedEnvironments: ['development', 'staging', 'chaos'],
  requireTenantOptIn: true,
  maxConcurrentExperiments: 5,
  maxProbability: 0.5, // 50% max
  protectedEndpoints: [
    '/health',
    '/ready',
    '/metrics',
    '/api/v1/auth/*',
    '/api/v1/emergency/*',
  ],
  defaultDurationLimitMs: 300000, // 5 minutes
  auditInjections: true,
  alertThresholdPerMinute: 100,
};

export const DEFAULT_LATENCY_CONFIG: LatencyConfig = {
  minMs: 100,
  maxMs: 2000,
  distribution: 'uniform',
};

export const DEFAULT_FAILURE_CONFIG: FailureConfig = {
  statusCode: 500,
  message: 'Chaos injection: Internal Server Error',
  errorType: 'ChaosInjectedError',
};

export const DEFAULT_RESOURCE_CONFIG: ResourceConfig = {
  durationMs: 30000,
  intensity: 0.5,
};

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  targets: [],
  durationMs: 60000,
  packetLossPercent: 10,
};

// ============================================================================
// Preset Experiments
// ============================================================================

export const EXPERIMENT_PRESETS: Record<string, Omit<ChaosExperiment, 'id' | 'injectionCount'>> = {
  'light-latency': {
    name: 'Light Latency Injection',
    type: 'latency',
    targets: ['/api/*'],
    probability: 0.1,
    config: {
      minMs: 50,
      maxMs: 200,
      distribution: 'uniform',
    } as LatencyConfig,
    enabled: false,
    tenantId: null,
  },
  'heavy-latency': {
    name: 'Heavy Latency Injection',
    type: 'latency',
    targets: ['/api/*'],
    probability: 0.2,
    config: {
      minMs: 500,
      maxMs: 3000,
      distribution: 'exponential',
    } as LatencyConfig,
    enabled: false,
    tenantId: null,
  },
  'random-failure': {
    name: 'Random 500 Errors',
    type: 'failure',
    targets: ['/api/*'],
    probability: 0.05,
    config: {
      statusCode: 500,
      message: 'Chaos: Random server error',
      errorType: 'ChaosError',
    } as FailureConfig,
    enabled: false,
    tenantId: null,
  },
  'database-timeout': {
    name: 'Database Timeout Simulation',
    type: 'timeout',
    targets: ['/api/v1/entities/*', '/api/v1/relationships/*'],
    probability: 0.1,
    config: {
      minMs: 5000,
      maxMs: 30000,
      distribution: 'uniform',
    } as LatencyConfig,
    enabled: false,
    tenantId: null,
  },
  'service-unavailable': {
    name: 'Service Unavailable',
    type: 'failure',
    targets: ['/api/*'],
    probability: 0.03,
    config: {
      statusCode: 503,
      message: 'Chaos: Service temporarily unavailable',
      errorType: 'ServiceUnavailable',
    } as FailureConfig,
    enabled: false,
    tenantId: null,
  },
};

// ============================================================================
// Validation Functions
// ============================================================================

export function validateExperiment(experiment: ChaosExperiment): string[] {
  const errors: string[] = [];

  if (!experiment.id) {
    errors.push('Experiment ID is required');
  }

  if (!experiment.name) {
    errors.push('Experiment name is required');
  }

  if (experiment.probability < 0 || experiment.probability > 1) {
    errors.push('Probability must be between 0 and 1');
  }

  if (experiment.targets.length === 0) {
    errors.push('At least one target is required');
  }

  switch (experiment.type) {
    case 'latency':
    case 'timeout': {
      const config = experiment.config as LatencyConfig;
      if (config.minMs < 0) errors.push('Minimum latency must be non-negative');
      if (config.maxMs < config.minMs) errors.push('Maximum latency must be >= minimum');
      break;
    }
    case 'failure': {
      const config = experiment.config as FailureConfig;
      if (config.statusCode < 400 || config.statusCode >= 600) {
        errors.push('Status code must be an error code (400-599)');
      }
      break;
    }
    case 'cpu':
    case 'memory':
    case 'disk': {
      const config = experiment.config as ResourceConfig;
      if (config.intensity < 0 || config.intensity > 1) {
        errors.push('Resource intensity must be between 0 and 1');
      }
      break;
    }
  }

  return errors;
}

export function isEnvironmentAllowed(
  environment: string,
  config: ChaosGlobalConfig
): boolean {
  return config.allowedEnvironments.includes(environment);
}

export function isEndpointProtected(
  endpoint: string,
  config: ChaosGlobalConfig
): boolean {
  return config.protectedEndpoints.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(endpoint);
  });
}

export default {
  DEFAULT_GLOBAL_CONFIG,
  DEFAULT_LATENCY_CONFIG,
  DEFAULT_FAILURE_CONFIG,
  EXPERIMENT_PRESETS,
  validateExperiment,
  isEnvironmentAllowed,
  isEndpointProtected,
};
