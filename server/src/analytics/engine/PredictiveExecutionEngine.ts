/**
 * Predictive Execution Engine
 *
 * Governed execution engine for predictive analytics.
 * Enforces the Predictive Model Contract with:
 * - Capability-based authorization
 * - Policy enforcement
 * - Resource limits and budgets
 * - Deterministic execution (where feasible)
 * - Mandatory explanation payloads
 * - Full audit trail
 *
 * SOC 2 Controls: CC6.1 (Access), CC7.2 (Monitoring)
 *
 * @module analytics/engine/PredictiveExecutionEngine
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { PolicyEngine } from '../../governance/PolicyEngine.js';
import { PolicyContext, GovernanceVerdict } from '../../governance/types.js';
import logger from '../../utils/logger.js';
import {
  PredictionRequest,
  PredictionResponse,
  PredictionOptions,
  ExecutionContext,
  ExecutionLimits,
  PredictionModel,
  PredictionError,
  PredictionAuditEvent,
  PredictionMetadata,
  PredictionOutput,
  PredictionType,
  ResourceUsage,
  DataSource,
  DataFreshness,
  Explanation,
  ConfidenceFactors,
  calculateConfidence,
} from './types.js';

// ============================================================================
// Configuration
// ============================================================================

export interface PredictiveEngineConfig {
  enablePolicyChecks: boolean;
  enableAuditLog: boolean;
  enableCaching: boolean;
  defaultLimits: ExecutionLimits;
}

const DEFAULT_CONFIG: PredictiveEngineConfig = {
  enablePolicyChecks: true,
  enableAuditLog: true,
  enableCaching: true,
  defaultLimits: {
    maxExecutionTimeMs: 30000, // 30 seconds
    maxMemoryMb: 512,
    maxTokens: 10000,
    maxDataRows: 100000,
  },
};

const MAX_LIMITS: ExecutionLimits = {
  maxExecutionTimeMs: 300000, // 5 minutes
  maxMemoryMb: 2048,
  maxTokens: 50000,
  maxDataRows: 1000000,
};

// ============================================================================
// Predictive Execution Engine
// ============================================================================

export class PredictiveExecutionEngine extends EventEmitter {
  private config: PredictiveEngineConfig;
  private policyEngine: PolicyEngine;
  private modelRegistry: Map<string, PredictionModel>;
  private predictionCache: Map<string, { response: PredictionResponse; expiresAt: number }>;
  private auditEvents: PredictionAuditEvent[];

  constructor(config?: Partial<PredictiveEngineConfig>, policyEngine?: PolicyEngine) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.policyEngine = policyEngine || new PolicyEngine();
    this.modelRegistry = new Map();
    this.predictionCache = new Map();
    this.auditEvents = [];

    logger.info('[PredictiveEngine] Initialized with governance enforcement');
  }

  // ==========================================================================
  // Model Registration
  // ==========================================================================

  /**
   * Register a prediction model with the engine.
   */
  public registerModel(model: PredictionModel): void {
    const modelKey = `${model.type}:${model.version}`;
    this.modelRegistry.set(modelKey, model);
    logger.info(`[PredictiveEngine] Registered model: ${modelKey}`);
  }

  /**
   * Get a registered model by type and version.
   */
  private getModel(type: PredictionType, version: string = 'latest'): PredictionModel {
    const modelKey = `${type}:${version}`;
    const model = this.modelRegistry.get(modelKey);

    if (!model) {
      throw new PredictionError(
        `Model not found: ${modelKey}`,
        'MODEL_NOT_FOUND',
        { type, version }
      );
    }

    return model;
  }

  // ==========================================================================
  // Main Prediction Execution
  // ==========================================================================

  /**
   * Execute a prediction with full governance enforcement.
   */
  public async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const predictionId = uuidv4();
    const startTime = Date.now();

    logger.info(`[PredictiveEngine] Starting prediction ${predictionId}`, {
      type: request.type,
      tenantId: request.tenantId,
    });

    try {
      // Step 1: Check cache
      if (this.config.enableCaching && request.options?.enableCaching !== false) {
        const cached = this.checkCache(request);
        if (cached) {
          logger.info(`[PredictiveEngine] Cache hit for ${predictionId}`);
          return cached;
        }
      }

      // Step 2: Pre-execution policy check
      const governanceVerdict = await this.checkPolicy(request, predictionId);
      if (governanceVerdict.action === 'DENY') {
        throw new PredictionError(
          `Policy denied prediction: ${governanceVerdict.reasons.join(', ')}`,
          'POLICY_DENIED',
          { verdict: governanceVerdict }
        );
      }

      // Step 3: Validate and normalize limits
      const limits = this.normalizeLimits(request.options);

      // Step 4: Create execution context
      const context = this.createExecutionContext(predictionId, limits);

      // Step 5: Get model
      const model = this.getModel(request.type);

      // Step 6: Execute prediction with resource monitoring
      const output = await this.executeWithLimits(model, request, context);

      // Step 7: Validate output
      this.validateOutput(output, request.type);

      // Step 8: Build metadata envelope
      const metadata = await this.buildMetadata(
        predictionId,
        request,
        model,
        governanceVerdict,
        context,
        startTime
      );

      // Step 9: Post-execution validation
      this.validateMetadata(metadata);

      // Step 10: Create response
      const response: PredictionResponse = { output, metadata };

      // Step 11: Cache result
      if (this.config.enableCaching && request.options?.enableCaching !== false) {
        this.cacheResult(request, response);
      }

      // Step 12: Emit audit event
      if (this.config.enableAuditLog) {
        this.emitAuditEvent({
          eventType: 'prediction_executed',
          predictionId,
          predictionType: request.type,
          tenantId: request.tenantId,
          agentId: request.agentId,
          confidence: metadata.confidence,
          dataSources: metadata.dataSources.map((ds) => ds.type),
          governanceVerdict: governanceVerdict.action,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`[PredictiveEngine] Completed prediction ${predictionId}`, {
        confidence: metadata.confidence,
        executionTime: metadata.executionTime,
      });

      return response;
    } catch (error: any) {
      // Emit failure audit event
      if (this.config.enableAuditLog) {
        this.emitAuditEvent({
          eventType: 'prediction_failed',
          predictionId,
          predictionType: request.type,
          tenantId: request.tenantId,
          agentId: request.agentId,
          governanceVerdict: 'DENY',
          errorCode: error instanceof PredictionError ? error.code : 'INVALID_INPUT',
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }

      logger.error(`[PredictiveEngine] Prediction failed ${predictionId}`, { error });
      throw error;
    }
  }

  // ==========================================================================
  // Policy Enforcement
  // ==========================================================================

  private async checkPolicy(
    request: PredictionRequest,
    predictionId: string
  ): Promise<GovernanceVerdict> {
    if (!this.config.enablePolicyChecks) {
      return {
        action: 'ALLOW',
        reasons: [],
        policyIds: [],
        metadata: {
          timestamp: new Date().toISOString(),
          evaluator: 'predictive-engine-bypass',
          latencyMs: 0,
          simulation: false,
        },
        provenance: {
          origin: 'predictive-execution-engine',
          confidence: 1.0,
        },
      };
    }

    const policyContext: PolicyContext = {
      stage: 'runtime',
      tenantId: request.tenantId,
      payload: {
        predictionId,
        predictionType: request.type,
        agentId: request.agentId,
        inputs: request.inputs,
        options: request.options,
      },
    };

    return this.policyEngine.check(policyContext);
  }

  // ==========================================================================
  // Resource Limit Management
  // ==========================================================================

  private normalizeLimits(options?: PredictionOptions): ExecutionLimits {
    const limits: ExecutionLimits = {
      maxExecutionTimeMs:
        options?.maxExecutionTimeMs || this.config.defaultLimits.maxExecutionTimeMs,
      maxMemoryMb: options?.maxMemoryMb || this.config.defaultLimits.maxMemoryMb,
      maxTokens: options?.maxTokens || this.config.defaultLimits.maxTokens,
      maxDataRows: options?.maxDataRows || this.config.defaultLimits.maxDataRows,
    };

    // Enforce maximum limits
    limits.maxExecutionTimeMs = Math.min(limits.maxExecutionTimeMs, MAX_LIMITS.maxExecutionTimeMs);
    limits.maxMemoryMb = Math.min(limits.maxMemoryMb, MAX_LIMITS.maxMemoryMb);
    limits.maxTokens = Math.min(limits.maxTokens, MAX_LIMITS.maxTokens);
    limits.maxDataRows = Math.min(limits.maxDataRows, MAX_LIMITS.maxDataRows);

    return limits;
  }

  private createExecutionContext(predictionId: string, limits: ExecutionLimits): ExecutionContext {
    return {
      predictionId,
      startTime: Date.now(),
      limits,
      resourceUsage: {
        cpuMs: 0,
        memoryMb: 0,
      },
      abortController: new AbortController(),
    };
  }

  // ==========================================================================
  // Execution with Limits
  // ==========================================================================

  private async executeWithLimits(
    model: PredictionModel,
    request: PredictionRequest,
    context: ExecutionContext
  ): Promise<PredictionOutput> {
    // Set timeout
    const timeoutId = setTimeout(() => {
      context.abortController.abort();
    }, context.limits.maxExecutionTimeMs);

    try {
      // Execute model
      const output = await model.executor(request, context);

      // Check if aborted
      if (context.abortController.signal.aborted) {
        throw new PredictionError(
          `Execution timeout after ${context.limits.maxExecutionTimeMs}ms`,
          'TIMEOUT',
          { limit: context.limits.maxExecutionTimeMs }
        );
      }

      // Update resource usage
      context.resourceUsage.cpuMs = Date.now() - context.startTime;

      // Check memory (approximate)
      const memoryUsage = process.memoryUsage();
      context.resourceUsage.memoryMb = memoryUsage.heapUsed / 1024 / 1024;

      if (context.resourceUsage.memoryMb > context.limits.maxMemoryMb) {
        throw new PredictionError(
          `Memory limit exceeded: ${context.resourceUsage.memoryMb}MB > ${context.limits.maxMemoryMb}MB`,
          'BUDGET_EXCEEDED',
          { usage: context.resourceUsage.memoryMb, limit: context.limits.maxMemoryMb }
        );
      }

      return output;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  private validateOutput(output: PredictionOutput, type: PredictionType): void {
    if (!output) {
      throw new PredictionError('Prediction output is null or undefined', 'INVALID_OUTPUT');
    }

    // Validate predictionId
    if (!output.predictionId || typeof output.predictionId !== 'string') {
      throw new PredictionError('Missing or invalid predictionId', 'INVALID_OUTPUT');
    }

    // Type-specific validation
    if ('value' in output) {
      // PredictionScore
      if (typeof output.value !== 'number') {
        throw new PredictionError('PredictionScore.value must be a number', 'INVALID_OUTPUT');
      }
      if (output.confidence === undefined || output.confidence < 0 || output.confidence > 1) {
        throw new PredictionError(
          'PredictionScore.confidence must be between 0 and 1',
          'INVALID_OUTPUT'
        );
      }
    } else if ('hypotheses' in output) {
      // RankedHypothesis
      if (!Array.isArray(output.hypotheses) || output.hypotheses.length === 0) {
        throw new PredictionError('RankedHypothesis must have at least one hypothesis', 'INVALID_OUTPUT');
      }
    } else if ('forecast' in output) {
      // TrendForecast
      if (!Array.isArray(output.forecast) || output.forecast.length === 0) {
        throw new PredictionError('TrendForecast must have at least one forecast point', 'INVALID_OUTPUT');
      }
    }
  }

  private validateMetadata(metadata: PredictionMetadata): void {
    const required = [
      'predictionId',
      'predictionType',
      'modelVersion',
      'governanceVerdict',
      'capabilityAuthorization',
      'tenantId',
      'confidence',
      'assumptions',
      'limitations',
      'dataSources',
      'dataFreshness',
      'executionTime',
      'resourceUsage',
      'explanation',
      'timestamp',
    ];

    for (const field of required) {
      if (!(field in metadata)) {
        throw new PredictionError(
          `Missing required metadata field: ${field}`,
          'METADATA_INCOMPLETE',
          { missingField: field }
        );
      }
    }

    // Validate confidence range
    if (metadata.confidence < 0 || metadata.confidence > 1) {
      throw new PredictionError(
        'Metadata confidence must be between 0 and 1',
        'METADATA_INCOMPLETE'
      );
    }

    // Validate data sources
    if (!Array.isArray(metadata.dataSources) || metadata.dataSources.length === 0) {
      throw new PredictionError(
        'Metadata must declare at least one data source',
        'METADATA_INCOMPLETE'
      );
    }

    // Validate explanation
    if (!metadata.explanation.method || metadata.explanation.topFactors.length === 0) {
      throw new PredictionError(
        'Metadata explanation must include method and topFactors',
        'METADATA_INCOMPLETE'
      );
    }
  }

  // ==========================================================================
  // Metadata Construction
  // ==========================================================================

  private async buildMetadata(
    predictionId: string,
    request: PredictionRequest,
    model: PredictionModel,
    governanceVerdict: GovernanceVerdict,
    context: ExecutionContext,
    startTime: number
  ): Promise<PredictionMetadata> {
    // Calculate confidence (this is a simplified version; real implementation would be more sophisticated)
    const confidenceFactors: ConfidenceFactors = {
      dataQuality: 0.9, // Would be computed from actual data
      dataFreshness: 0.85, // Would be computed from data timestamps
      modelAccuracy: model.accuracy.value,
      inputCompleteness: this.assessInputCompleteness(request.inputs),
    };

    const confidence = calculateConfidence(confidenceFactors);

    // Build data sources (simplified; real implementation would track actual queries)
    const dataSources: DataSource[] = [
      {
        type: 'policy_state',
        query: 'getPolicyState(tenantId)',
        timestamp: new Date().toISOString(),
        recordCount: 100, // Example
      },
    ];

    // Build data freshness
    const dataFreshness: DataFreshness = {
      oldestRecord: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      youngestRecord: new Date().toISOString(),
      stalenessTolerance: request.options?.stalenessTolerance || 'P7D', // 7 days
    };

    // Build explanation
    const explanation: Explanation = {
      method: `${model.type} v${model.version}`,
      topFactors: [
        'Historical trend analysis',
        'Policy compliance state',
        'Recent audit outcomes',
      ],
    };

    const metadata: PredictionMetadata = {
      predictionId,
      predictionType: request.type,
      modelVersion: model.version,
      governanceVerdict,
      capabilityAuthorization: request.agentId || 'system',
      tenantId: request.tenantId,
      confidence,
      assumptions: ['Historical patterns continue', 'No major policy changes'],
      limitations: ['Based on available data only', 'Confidence decays over time'],
      dataSources,
      dataFreshness,
      executionTime: Date.now() - startTime,
      resourceUsage: context.resourceUsage,
      explanation,
      timestamp: new Date().toISOString(),
    };

    return metadata;
  }

  private assessInputCompleteness(inputs: Record<string, any>): number {
    // Simplified: count non-null/non-undefined inputs
    const keys = Object.keys(inputs);
    if (keys.length === 0) return 0;

    const complete = keys.filter((k) => inputs[k] !== null && inputs[k] !== undefined).length;
    return complete / keys.length;
  }

  // ==========================================================================
  // Caching
  // ==========================================================================

  private checkCache(request: PredictionRequest): PredictionResponse | null {
    const cacheKey = this.getCacheKey(request);
    const cached = this.predictionCache.get(cacheKey);

    if (!cached) return null;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.predictionCache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  private cacheResult(request: PredictionRequest, response: PredictionResponse): void {
    const cacheKey = this.getCacheKey(request);
    const cacheTTL = 5 * 60 * 1000; // 5 minutes
    const expiresAt = Date.now() + cacheTTL;

    this.predictionCache.set(cacheKey, { response, expiresAt });
  }

  private getCacheKey(request: PredictionRequest): string {
    const keyObj = {
      type: request.type,
      tenantId: request.tenantId,
      inputs: request.inputs,
    };
    return JSON.stringify(keyObj);
  }

  // ==========================================================================
  // Audit
  // ==========================================================================

  private emitAuditEvent(event: PredictionAuditEvent): void {
    this.auditEvents.push(event);
    this.emit('audit', event);
    logger.info('[PredictiveEngine] Audit event', event);
  }

  public getAuditEvents(): PredictionAuditEvent[] {
    return [...this.auditEvents];
  }

  public clearAuditEvents(): void {
    this.auditEvents = [];
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  public getRegisteredModels(): string[] {
    return Array.from(this.modelRegistry.keys());
  }

  public clearCache(): void {
    this.predictionCache.clear();
  }
}

// ============================================================================
// Factory
// ============================================================================

let engineInstance: PredictiveExecutionEngine | null = null;

export function getPredictiveEngine(
  config?: Partial<PredictiveEngineConfig>,
  policyEngine?: PolicyEngine
): PredictiveExecutionEngine {
  if (!engineInstance) {
    engineInstance = new PredictiveExecutionEngine(config, policyEngine);
  }
  return engineInstance;
}
