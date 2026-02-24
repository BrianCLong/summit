/**
 * Chaos Controller
 *
 * Central controller for managing chaos engineering experiments.
 * Provides API for enabling/disabling experiments and middleware integration.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.3 (Incident Response Testing)
 *
 * @module chaos/ChaosController
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  ChaosExperiment,
  ChaosGlobalConfig,
  ChaosInjectorType,
  LatencyConfig,
  FailureConfig,
  DEFAULT_GLOBAL_CONFIG,
  EXPERIMENT_PRESETS,
  validateExperiment,
  isEnvironmentAllowed,
  isEndpointProtected,
} from './ChaosConfig.js';
import {
  executeInjection,
  InjectionContext,
  InjectionResult,
  ChaosInjectedError,
} from './ChaosInjectors.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface ChaosControllerStats {
  totalExperiments: number;
  activeExperiments: number;
  totalInjections: number;
  injectionsByType: Record<ChaosInjectorType, number>;
  lastInjectionAt: string | null;
  isEnabled: boolean;
}

export interface ExperimentCreateOptions {
  name: string;
  type: ChaosInjectorType;
  targets: string[];
  probability: number;
  config: LatencyConfig | FailureConfig;
  tenantId?: string;
  maxInjections?: number;
  durationMs?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'chaos-controller-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'ChaosController',
  };
}

// ============================================================================
// Chaos Controller Implementation
// ============================================================================

export class ChaosController extends EventEmitter {
  private globalConfig: ChaosGlobalConfig;
  private experiments: Map<string, ChaosExperiment> = new Map();
  private injectionHistory: InjectionResult[] = [];
  private stats: ChaosControllerStats;
  private environment: string;
  private optedInTenants: Set<string> = new Set();

  constructor(
    environment: string = process.env.NODE_ENV || 'development',
    config?: Partial<ChaosGlobalConfig>
  ) {
    super();
    this.environment = environment;
    this.globalConfig = { ...DEFAULT_GLOBAL_CONFIG, ...config };
    this.stats = {
      totalExperiments: 0,
      activeExperiments: 0,
      totalInjections: 0,
      injectionsByType: {
        latency: 0,
        failure: 0,
        cpu: 0,
        memory: 0,
        disk: 0,
        network_partition: 0,
        packet_loss: 0,
        dns_failure: 0,
        timeout: 0,
        exception: 0,
        region_kill: 0,
      },
      lastInjectionAt: null,
      isEnabled: this.globalConfig.enabled,
    };

    logger.info(
      {
        environment: this.environment,
        enabled: this.globalConfig.enabled,
        allowedEnvironments: this.globalConfig.allowedEnvironments,
      },
      'ChaosController initialized'
    );
  }

  // --------------------------------------------------------------------------
  // Global Control
  // --------------------------------------------------------------------------

  /**
   * Enable chaos engineering globally
   */
  enable(): DataEnvelope<boolean> {
    if (!isEnvironmentAllowed(this.environment, this.globalConfig)) {
      logger.warn(
        { environment: this.environment },
        'Cannot enable chaos in this environment'
      );

      return createDataEnvelope(false, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(
          GovernanceResult.DENY,
          `Chaos not allowed in ${this.environment} environment`
        ),
        classification: DataClassification.INTERNAL,
      });
    }

    this.globalConfig.enabled = true;
    this.stats.isEnabled = true;

    this.emit('chaos:enabled', { environment: this.environment });

    logger.info({ environment: this.environment }, 'Chaos engineering enabled');

    return createDataEnvelope(true, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Chaos enabled'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Disable chaos engineering globally (kill switch)
   */
  disable(): DataEnvelope<boolean> {
    this.globalConfig.enabled = false;
    this.stats.isEnabled = false;

    // Disable all active experiments
    for (const [id, experiment] of this.experiments) {
      if (experiment.enabled) {
        experiment.enabled = false;
      }
    }

    this.emit('chaos:disabled', { environment: this.environment });

    logger.info('Chaos engineering disabled (kill switch activated)');

    return createDataEnvelope(true, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Chaos disabled'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Check if chaos is enabled
   */
  isEnabled(): boolean {
    return this.globalConfig.enabled;
  }

  // --------------------------------------------------------------------------
  // Tenant Opt-In
  // --------------------------------------------------------------------------

  /**
   * Opt a tenant into chaos experiments
   */
  optInTenant(tenantId: string): DataEnvelope<boolean> {
    this.optedInTenants.add(tenantId);

    logger.info({ tenantId }, 'Tenant opted into chaos experiments');

    return createDataEnvelope(true, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Tenant opted in'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Opt a tenant out of chaos experiments
   */
  optOutTenant(tenantId: string): DataEnvelope<boolean> {
    this.optedInTenants.delete(tenantId);

    logger.info({ tenantId }, 'Tenant opted out of chaos experiments');

    return createDataEnvelope(true, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Tenant opted out'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Check if tenant is opted in
   */
  isTenantOptedIn(tenantId: string): boolean {
    return this.optedInTenants.has(tenantId);
  }

  // --------------------------------------------------------------------------
  // Experiment Management
  // --------------------------------------------------------------------------

  /**
   * Create a new experiment
   */
  createExperiment(options: ExperimentCreateOptions): DataEnvelope<ChaosExperiment> {
    // Check concurrent experiment limit
    const activeCount = Array.from(this.experiments.values())
      .filter(e => e.enabled).length;

    if (activeCount >= this.globalConfig.maxConcurrentExperiments) {
      return createDataEnvelope(null as any, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(
          GovernanceResult.DENY,
          'Maximum concurrent experiments reached'
        ),
        classification: DataClassification.INTERNAL,
      });
    }

    // Check probability limit
    if (options.probability > this.globalConfig.maxProbability) {
      return createDataEnvelope(null as any, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(
          GovernanceResult.DENY,
          `Probability exceeds maximum (${this.globalConfig.maxProbability})`
        ),
        classification: DataClassification.INTERNAL,
      });
    }

    const experiment: ChaosExperiment = {
      id: uuidv4(),
      name: options.name,
      type: options.type,
      targets: options.targets,
      probability: options.probability,
      config: options.config,
      enabled: false,
      tenantId: options.tenantId || null,
      maxInjections: options.maxInjections,
      injectionCount: 0,
      startTime: options.durationMs ? new Date() : undefined,
      endTime: options.durationMs
        ? new Date(Date.now() + options.durationMs)
        : undefined,
    };

    // Validate
    const errors = validateExperiment(experiment);
    if (errors.length > 0) {
      return createDataEnvelope(null as any, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(
          GovernanceResult.DENY,
          `Validation errors: ${errors.join(', ')}`
        ),
        classification: DataClassification.INTERNAL,
      });
    }

    this.experiments.set(experiment.id, experiment);
    this.stats.totalExperiments++;

    this.emit('experiment:created', { experiment });

    logger.info(
      {
        experimentId: experiment.id,
        name: experiment.name,
        type: experiment.type,
      },
      'Chaos experiment created'
    );

    return createDataEnvelope(experiment, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Experiment created'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Create experiment from preset
   */
  createFromPreset(presetName: string, overrides?: Partial<ExperimentCreateOptions>): DataEnvelope<ChaosExperiment> {
    const preset = EXPERIMENT_PRESETS[presetName];
    if (!preset) {
      return createDataEnvelope(null as any, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(
          GovernanceResult.DENY,
          `Preset '${presetName}' not found`
        ),
        classification: DataClassification.INTERNAL,
      });
    }

    return this.createExperiment({
      ...preset,
      ...overrides,
    } as ExperimentCreateOptions);
  }

  /**
   * Enable an experiment
   */
  enableExperiment(experimentId: string): DataEnvelope<boolean> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return createDataEnvelope(false, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Experiment not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    if (!this.globalConfig.enabled) {
      return createDataEnvelope(false, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(
          GovernanceResult.DENY,
          'Chaos is globally disabled'
        ),
        classification: DataClassification.INTERNAL,
      });
    }

    experiment.enabled = true;
    experiment.startTime = new Date();
    this.stats.activeExperiments++;

    this.emit('experiment:enabled', { experimentId, name: experiment.name });

    logger.info(
      { experimentId, name: experiment.name },
      'Chaos experiment enabled'
    );

    return createDataEnvelope(true, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Experiment enabled'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Disable an experiment
   */
  disableExperiment(experimentId: string): DataEnvelope<boolean> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return createDataEnvelope(false, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Experiment not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    if (experiment.enabled) {
      experiment.enabled = false;
      this.stats.activeExperiments--;
    }

    this.emit('experiment:disabled', { experimentId, name: experiment.name });

    logger.info(
      { experimentId, name: experiment.name },
      'Chaos experiment disabled'
    );

    return createDataEnvelope(true, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Experiment disabled'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Delete an experiment
   */
  deleteExperiment(experimentId: string): DataEnvelope<boolean> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return createDataEnvelope(false, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(GovernanceResult.DENY, 'Experiment not found'),
        classification: DataClassification.INTERNAL,
      });
    }

    if (experiment.enabled) {
      this.stats.activeExperiments--;
    }

    this.experiments.delete(experimentId);
    this.stats.totalExperiments--;

    this.emit('experiment:deleted', { experimentId, name: experiment.name });

    return createDataEnvelope(true, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Experiment deleted'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): ChaosExperiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * List all experiments
   */
  listExperiments(): DataEnvelope<ChaosExperiment[]> {
    return createDataEnvelope(Array.from(this.experiments.values()), {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Experiments listed'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Injection Execution
  // --------------------------------------------------------------------------

  /**
   * Attempt to inject chaos for a request
   */
  async maybeInject(context: InjectionContext): Promise<DataEnvelope<InjectionResult | null>> {
    // Check global enabled
    if (!this.globalConfig.enabled) {
      return createDataEnvelope(null, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Chaos disabled'),
        classification: DataClassification.INTERNAL,
      });
    }

    // Check protected endpoints
    if (isEndpointProtected(context.path, this.globalConfig)) {
      return createDataEnvelope(null, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Protected endpoint'),
        classification: DataClassification.INTERNAL,
      });
    }

    // Check tenant opt-in
    if (
      this.globalConfig.requireTenantOptIn &&
      !this.isTenantOptedIn(context.tenantId)
    ) {
      return createDataEnvelope(null, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Tenant not opted in'),
        classification: DataClassification.INTERNAL,
      });
    }

    // Find applicable experiments
    const activeExperiments = Array.from(this.experiments.values()).filter(e => {
      if (!e.enabled) return false;
      if (e.tenantId && e.tenantId !== context.tenantId) return false;
      if (e.maxInjections && e.injectionCount >= e.maxInjections) return false;
      if (e.endTime && new Date() > e.endTime) return false;
      return true;
    });

    if (activeExperiments.length === 0) {
      return createDataEnvelope(null, {
        source: 'ChaosController',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'No active experiments'),
        classification: DataClassification.INTERNAL,
      });
    }

    // Try each experiment
    for (const experiment of activeExperiments) {
      const result = await executeInjection(experiment, context);

      if (result.data) {
        // Injection occurred
        experiment.injectionCount++;
        this.stats.totalInjections++;
        this.stats.injectionsByType[experiment.type]++;
        this.stats.lastInjectionAt = new Date().toISOString();

        // Store in history
        this.injectionHistory.push(result.data);
        if (this.injectionHistory.length > 1000) {
          this.injectionHistory.shift();
        }

        // Audit if configured
        if (this.globalConfig.auditInjections) {
          this.emit('injection:occurred', {
            result: result.data,
            context,
          });
        }

        return result;
      }
    }

    return createDataEnvelope(null, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'No injection triggered'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Stats & History
  // --------------------------------------------------------------------------

  /**
   * Get controller statistics
   */
  getStats(): DataEnvelope<ChaosControllerStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'ChaosController',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get injection history
   */
  getHistory(limit: number = 100): DataEnvelope<InjectionResult[]> {
    return createDataEnvelope(
      this.injectionHistory.slice(-limit),
      {
        source: 'ChaosController',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'History retrieved'),
        classification: DataClassification.INTERNAL,
      }
    );
  }

  /**
   * Clear injection history
   */
  clearHistory(): void {
    this.injectionHistory = [];
  }

  // --------------------------------------------------------------------------
  // Middleware
  // --------------------------------------------------------------------------

  /**
   * Express middleware for chaos injection
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const context: InjectionContext = {
        requestId: (req as any).requestId || uuidv4(),
        path: req.path,
        method: req.method,
        tenantId: (req as any).tenantId || 'unknown',
        timestamp: new Date(),
      };

      const result = await this.maybeInject(context);

      if (result.data) {
        const injection = result.data;

        // Handle different injection types
        if (injection.injectorType === 'failure') {
          const details = injection.details as { statusCode: number; message: string; errorType: string };
          res.status(details.statusCode).json({
            error: details.errorType,
            message: details.message,
            chaosInjected: true,
            experimentId: injection.experimentId,
          });
          return;
        }

        if (injection.injectorType === 'exception') {
          const details = injection.details as { message: string; statusCode?: number };
          throw new ChaosInjectedError(
            details.message,
            details.statusCode || 500,
            injection.experimentId,
            injection.experimentName
          );
        }

        // For latency/timeout, the delay was already applied in the injector
        // Attach injection info to request for downstream use
        (req as any).chaosInjection = injection;
      }

      next();
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: ChaosController | null = null;

export function getChaosController(
  environment?: string,
  config?: Partial<ChaosGlobalConfig>
): ChaosController {
  if (!instance) {
    instance = new ChaosController(environment, config);
  }
  return instance;
}

export function resetChaosController(): void {
  if (instance) {
    instance.disable();
    instance = null;
  }
}

export default ChaosController;
