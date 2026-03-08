/**
 * Chaos Injectors
 *
 * Implements various fault injection mechanisms for chaos engineering.
 * Each injector simulates a specific type of failure scenario.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.3 (Incident Response Testing)
 *
 * @module chaos/ChaosInjectors
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ChaosExperiment,
  ChaosInjectorType,
  LatencyConfig,
  FailureConfig,
  ResourceConfig,
  NetworkConfig,
} from './ChaosConfig.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';
import { RegionalAvailabilityService } from '../services/RegionalAvailabilityService.js';

// ============================================================================
// Types
// ============================================================================

export interface InjectionResult {
  injected: boolean;
  injectorType: ChaosInjectorType;
  experimentId: string;
  experimentName: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface Injector {
  type: ChaosInjectorType;
  inject: (experiment: ChaosExperiment, context: InjectionContext) => Promise<InjectionResult>;
  canApply: (experiment: ChaosExperiment, context: InjectionContext) => boolean;
}

export interface InjectionContext {
  requestId: string;
  path: string;
  method: string;
  tenantId: string;
  timestamp: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'chaos-injector-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'ChaosInjector',
  };
}

function shouldInject(probability: number): boolean {
  return Math.random() < probability;
}

function matchesTarget(path: string, targets: string[]): boolean {
  return targets.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(path);
  });
}

function generateLatency(config: LatencyConfig): number {
  const { minMs, maxMs, distribution } = config;
  const range = maxMs - minMs;

  switch (distribution) {
    case 'uniform':
      return minMs + Math.random() * range;

    case 'normal': {
      // Box-Muller transform for normal distribution
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      // Scale to our range (mean at midpoint, ~95% within range)
      const mean = (minMs + maxMs) / 2;
      const stdDev = range / 4;
      return Math.max(minMs, Math.min(maxMs, mean + z * stdDev));
    }

    case 'exponential': {
      // Exponential distribution (more short delays, fewer long ones)
      const lambda = 2 / range;
      const delay = -Math.log(1 - Math.random()) / lambda;
      return Math.min(maxMs, minMs + delay);
    }

    default:
      return minMs + Math.random() * range;
  }
}

// ============================================================================
// Injector Implementations
// ============================================================================

/**
 * Latency Injector - Adds artificial delay to requests
 */
export const latencyInjector: Injector = {
  type: 'latency',

  canApply(experiment: ChaosExperiment, context: InjectionContext): boolean {
    return matchesTarget(context.path, experiment.targets);
  },

  async inject(experiment: ChaosExperiment, context: InjectionContext): Promise<InjectionResult> {
    const config = experiment.config as LatencyConfig;
    const delayMs = generateLatency(config);

    logger.debug(
      {
        experimentId: experiment.id,
        requestId: context.requestId,
        delayMs,
        path: context.path,
      },
      'Injecting latency'
    );

    // Actually delay
    await new Promise(resolve => setTimeout(resolve, delayMs));

    return {
      injected: true,
      injectorType: 'latency',
      experimentId: experiment.id,
      experimentName: experiment.name,
      details: {
        delayMs,
        distribution: config.distribution,
      },
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * Failure Injector - Returns error responses
 */
export const failureInjector: Injector = {
  type: 'failure',

  canApply(experiment: ChaosExperiment, context: InjectionContext): boolean {
    return matchesTarget(context.path, experiment.targets);
  },

  async inject(experiment: ChaosExperiment, context: InjectionContext): Promise<InjectionResult> {
    const config = experiment.config as FailureConfig;

    logger.debug(
      {
        experimentId: experiment.id,
        requestId: context.requestId,
        statusCode: config.statusCode,
        path: context.path,
      },
      'Injecting failure'
    );

    return {
      injected: true,
      injectorType: 'failure',
      experimentId: experiment.id,
      experimentName: experiment.name,
      details: {
        statusCode: config.statusCode,
        message: config.message,
        errorType: config.errorType,
      },
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * Timeout Injector - Simulates request timeouts
 */
export const timeoutInjector: Injector = {
  type: 'timeout',

  canApply(experiment: ChaosExperiment, context: InjectionContext): boolean {
    return matchesTarget(context.path, experiment.targets);
  },

  async inject(experiment: ChaosExperiment, context: InjectionContext): Promise<InjectionResult> {
    const config = experiment.config as LatencyConfig;
    const delayMs = generateLatency(config);

    logger.debug(
      {
        experimentId: experiment.id,
        requestId: context.requestId,
        timeoutMs: delayMs,
        path: context.path,
      },
      'Injecting timeout'
    );

    // Delay that will likely trigger client timeout
    await new Promise(resolve => setTimeout(resolve, delayMs));

    return {
      injected: true,
      injectorType: 'timeout',
      experimentId: experiment.id,
      experimentName: experiment.name,
      details: {
        delayMs,
        simulatedTimeout: true,
      },
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * Exception Injector - Throws runtime exceptions
 */
export const exceptionInjector: Injector = {
  type: 'exception',

  canApply(experiment: ChaosExperiment, context: InjectionContext): boolean {
    return matchesTarget(context.path, experiment.targets);
  },

  async inject(experiment: ChaosExperiment, context: InjectionContext): Promise<InjectionResult> {
    const config = experiment.config as FailureConfig;

    logger.debug(
      {
        experimentId: experiment.id,
        requestId: context.requestId,
        errorType: config.errorType,
        path: context.path,
      },
      'Injecting exception'
    );

    return {
      injected: true,
      injectorType: 'exception',
      experimentId: experiment.id,
      experimentName: experiment.name,
      details: {
        errorType: config.errorType,
        message: config.message,
        throwException: true,
      },
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * Region Kill Injector - Simulates a complete regional outage
 */
export const regionKillInjector: Injector = {
  type: 'region_kill',

  canApply(experiment: ChaosExperiment, _context: InjectionContext): boolean {
    return true; 
  },

  async inject(experiment: ChaosExperiment, _context: InjectionContext): Promise<InjectionResult> {
    const targetRegion = (experiment.config as any).region || 'us-east-1';
    
    logger.warn({ experimentId: experiment.id, targetRegion }, 'Chaos: Killing region!');

    const availability = RegionalAvailabilityService.getInstance();
    availability.setRegionStatus(targetRegion, 'DOWN');

    return {
      injected: true,
      injectorType: 'region_kill',
      experimentId: experiment.id,
      experimentName: experiment.name,
      details: {
        killedRegion: targetRegion,
        status: 'DOWN'
      },
      timestamp: new Date().toISOString(),
    };
  },
};

// ============================================================================
// Injector Registry
// ============================================================================

const injectorRegistry: Map<ChaosInjectorType, Injector> = new Map([
  ['latency', latencyInjector],
  ['failure', failureInjector],
  ['timeout', timeoutInjector],
  ['exception', exceptionInjector],
  ['region_kill', regionKillInjector],
]);

/**
 * Get an injector by type
 */
export function getInjector(type: ChaosInjectorType): Injector | undefined {
  return injectorRegistry.get(type);
}

/**
 * Register a custom injector
 */
export function registerInjector(injector: Injector): void {
  injectorRegistry.set(injector.type, injector);
  logger.info({ type: injector.type }, 'Custom chaos injector registered');
}

/**
 * Execute an experiment's injection
 */
export async function executeInjection(
  experiment: ChaosExperiment,
  context: InjectionContext
): Promise<DataEnvelope<InjectionResult | null>> {
  // Check probability
  if (!shouldInject(experiment.probability)) {
    return createDataEnvelope(null, {
      source: 'ChaosInjector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Probability check passed'),
      classification: DataClassification.INTERNAL,
    });
  }

  // Get injector
  const injector = getInjector(experiment.type);
  if (!injector) {
    logger.warn({ type: experiment.type }, 'No injector found for type');
    return createDataEnvelope(null, {
      source: 'ChaosInjector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'No injector available'),
      classification: DataClassification.INTERNAL,
    });
  }

  // Check if injector can apply
  if (!injector.canApply(experiment, context)) {
    return createDataEnvelope(null, {
      source: 'ChaosInjector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Injector not applicable'),
      classification: DataClassification.INTERNAL,
    });
  }

  // Execute injection
  try {
    const result = await injector.inject(experiment, context);

    logger.info(
      {
        experimentId: experiment.id,
        experimentName: experiment.name,
        injectorType: experiment.type,
        requestId: context.requestId,
        path: context.path,
      },
      'Chaos injected'
    );

    return createDataEnvelope(result, {
      source: 'ChaosInjector',
      governanceVerdict: createVerdict(GovernanceResult.FLAG, `Chaos injected: ${experiment.type}`),
      classification: DataClassification.INTERNAL,
    });
  } catch (error: any) {
    logger.error(
      {
        error,
        experimentId: experiment.id,
        requestId: context.requestId,
      },
      'Chaos injection failed'
    );

    return createDataEnvelope(null, {
      source: 'ChaosInjector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Injection failed'),
      classification: DataClassification.INTERNAL,
    });
  }
}

// ============================================================================
// Custom Chaos Errors
// ============================================================================

/**
 * Error class for chaos-injected failures
 */
export class ChaosInjectedError extends Error {
  public readonly statusCode: number;
  public readonly experimentId: string;
  public readonly experimentName: string;
  public readonly injectedAt: Date;

  constructor(
    message: string,
    statusCode: number,
    experimentId: string,
    experimentName: string
  ) {
    super(message);
    this.name = 'ChaosInjectedError';
    this.statusCode = statusCode;
    this.experimentId = experimentId;
    this.experimentName = experimentName;
    this.injectedAt = new Date();
  }
}

export default {
  getInjector,
  registerInjector,
  executeInjection,
  ChaosInjectedError,
};
