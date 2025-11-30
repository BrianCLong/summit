/**
 * Model Selection Service
 *
 * Core routing logic for selecting models based on:
 * - Tenant bindings
 * - Routing rules
 * - Deployment configurations
 * - Shadow mode and canary rollout
 */

import { PoolClient } from 'pg';
import { db } from '../db/connection.js';
import { logger, createChildLogger } from '../utils/logger.js';
import { NoAvailableModelError, CircuitBreakerOpenError } from '../utils/errors.js';
import {
  ModelSelectionRequest,
  ModelSelectionResponse,
  ModelCapability,
  RoutingRule,
  RoutingCondition,
  TenantModelBinding,
  DeploymentConfig,
  DeploymentMode,
  Model,
  ModelVersion,
  PolicyProfile,
} from '../types/index.js';
import { modelRegistry } from '../registry/ModelRegistry.js';
import { policyRegistry } from '../registry/PolicyRegistry.js';
import { deploymentRegistry } from '../registry/DeploymentRegistry.js';
import { routingRegistry } from '../registry/RoutingRegistry.js';

// ============================================================================
// Circuit Breaker State Management
// ============================================================================

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

const circuitBreakerStates = new Map<string, CircuitBreakerState>();

function getCircuitBreakerState(modelVersionId: string): CircuitBreakerState {
  if (!circuitBreakerStates.has(modelVersionId)) {
    circuitBreakerStates.set(modelVersionId, {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
    });
  }
  return circuitBreakerStates.get(modelVersionId)!;
}

// ============================================================================
// Model Selection Service
// ============================================================================

export interface SelectionContext {
  tenantId: string;
  userId?: string;
  capability: ModelCapability;
  featureFlags: string[];
  headers: Record<string, string>;
  preferredProvider?: string;
  requiredTags?: string[];
  excludeTags?: string[];
  maxLatencyMs?: number;
  requireApproved: boolean;
}

export interface SelectedModel {
  model: Model;
  version: ModelVersion;
  deployment: DeploymentConfig;
  policyProfile?: PolicyProfile;
  routingRule?: RoutingRule;
  tenantBinding?: TenantModelBinding;
  isShadow: boolean;
}

export class ModelSelectionService {
  private readonly log = createChildLogger({ component: 'ModelSelectionService' });

  /**
   * Select the best model for a given request
   */
  async selectModel(request: ModelSelectionRequest): Promise<ModelSelectionResponse> {
    const startTime = Date.now();

    const context: SelectionContext = {
      tenantId: request.tenantId,
      userId: request.userId,
      capability: request.capability,
      featureFlags: request.featureFlags,
      headers: request.headers,
      preferredProvider: request.preferredProvider,
      requiredTags: request.requiredTags,
      excludeTags: request.excludeTags,
      maxLatencyMs: request.maxLatencyMs,
      requireApproved: request.requireApproved,
    };

    this.log.debug({ message: 'Selecting model', context });

    // Step 1: Check tenant-specific bindings
    let selectedModel = await this.selectFromTenantBindings(context);

    // Step 2: If no tenant binding, check routing rules
    if (!selectedModel) {
      selectedModel = await this.selectFromRoutingRules(context);
    }

    // Step 3: If no routing rule matches, fall back to default selection
    if (!selectedModel) {
      selectedModel = await this.selectDefault(context);
    }

    if (!selectedModel) {
      throw new NoAvailableModelError(context.capability, context.tenantId);
    }

    // Step 4: Check circuit breaker
    const cbState = getCircuitBreakerState(selectedModel.version.id);
    if (cbState.state === 'open') {
      // Check if we should transition to half-open
      const deployment = selectedModel.deployment;
      const waitDuration = deployment.circuitBreaker.waitDurationInOpenStateMs || 60000;

      if (Date.now() - cbState.lastFailureTime > waitDuration) {
        cbState.state = 'half-open';
        cbState.successCount = 0;
      } else {
        throw new CircuitBreakerOpenError(selectedModel.version.id);
      }
    }

    // Build response
    const response: ModelSelectionResponse = {
      modelId: selectedModel.model.id,
      modelVersionId: selectedModel.version.id,
      modelName: selectedModel.model.name,
      version: selectedModel.version.version,
      endpoint: selectedModel.version.endpoint!,
      endpointType: selectedModel.version.endpointType,
      configuration: selectedModel.version.configuration,
      policyProfile: selectedModel.policyProfile
        ? {
            id: selectedModel.policyProfile.id,
            name: selectedModel.policyProfile.name,
            rules: selectedModel.policyProfile.rules as Record<string, unknown>,
          }
        : undefined,
      routingMetadata: {
        routingRuleId: selectedModel.routingRule?.id,
        deploymentMode: selectedModel.deployment.mode,
        trafficPercentage: selectedModel.deployment.trafficPercentage,
        isShadow: selectedModel.isShadow,
      },
      selectionTimestamp: new Date(),
    };

    const selectionTime = Date.now() - startTime;
    this.log.info({
      message: 'Model selected',
      modelId: response.modelId,
      modelVersionId: response.modelVersionId,
      tenantId: context.tenantId,
      capability: context.capability,
      selectionTimeMs: selectionTime,
      isShadow: response.routingMetadata.isShadow,
    });

    return response;
  }

  /**
   * Select model from tenant-specific bindings
   */
  private async selectFromTenantBindings(context: SelectionContext): Promise<SelectedModel | null> {
    const bindings = await routingRegistry.getActiveTenantBindingsForCapability(
      context.tenantId,
      context.capability,
    );

    for (const binding of bindings) {
      const selected = await this.trySelectModelVersion(binding.modelVersionId, context, {
        tenantBinding: binding,
      });

      if (selected) {
        return selected;
      }
    }

    return null;
  }

  /**
   * Select model from routing rules
   */
  private async selectFromRoutingRules(context: SelectionContext): Promise<SelectedModel | null> {
    const rules = await routingRegistry.getActiveRoutingRules();

    for (const rule of rules) {
      // Check if rule matches the context
      if (this.evaluateRoutingRule(rule, context)) {
        const selected = await this.trySelectModelVersion(rule.targetModelVersionId, context, {
          routingRule: rule,
        });

        if (selected) {
          return selected;
        }

        // Try fallback if target fails
        if (rule.fallbackModelVersionId) {
          const fallback = await this.trySelectModelVersion(rule.fallbackModelVersionId, context, {
            routingRule: rule,
          });

          if (fallback) {
            return fallback;
          }
        }
      }
    }

    return null;
  }

  /**
   * Select default model for capability
   */
  private async selectDefault(context: SelectionContext): Promise<SelectedModel | null> {
    const modelsWithVersions = await modelRegistry.getActiveVersionsForCapability(context.capability);

    for (const { model, version } of modelsWithVersions) {
      // Apply filters
      if (context.preferredProvider && model.provider !== context.preferredProvider) {
        continue;
      }

      if (context.requiredTags && context.requiredTags.length > 0) {
        const hasAllTags = context.requiredTags.every((tag) => model.tags.includes(tag));
        if (!hasAllTags) continue;
      }

      if (context.excludeTags && context.excludeTags.length > 0) {
        const hasExcludedTag = context.excludeTags.some((tag) => model.tags.includes(tag));
        if (hasExcludedTag) continue;
      }

      if (context.maxLatencyMs && version.performanceMetrics.p95LatencyMs) {
        if (version.performanceMetrics.p95LatencyMs > context.maxLatencyMs) {
          continue;
        }
      }

      const selected = await this.trySelectModelVersion(version.id, context, {});
      if (selected) {
        return selected;
      }
    }

    return null;
  }

  /**
   * Try to select a specific model version
   */
  private async trySelectModelVersion(
    modelVersionId: string,
    context: SelectionContext,
    metadata: { routingRule?: RoutingRule; tenantBinding?: TenantModelBinding },
  ): Promise<SelectedModel | null> {
    try {
      const version = await modelRegistry.getModelVersion(modelVersionId);

      // Check if version is approved for production
      if (context.requireApproved && version.status !== 'active') {
        return null;
      }

      // Check if endpoint is configured
      if (!version.endpoint) {
        return null;
      }

      const model = await modelRegistry.getModel(version.modelId);

      // Get deployment config for production
      const deployment = await deploymentRegistry.getDeploymentConfigForEnvironment(
        modelVersionId,
        'production',
      );

      if (!deployment || !deployment.isActive) {
        return null;
      }

      // Get policy profile
      let policyProfile: PolicyProfile | undefined;
      const policyProfileId =
        metadata.tenantBinding?.policyProfileId || deployment.policyProfileId;

      if (policyProfileId) {
        policyProfile = await policyRegistry.getPolicyProfile(policyProfileId);
      } else {
        policyProfile = (await policyRegistry.getDefaultPolicyProfile()) || undefined;
      }

      // Determine if this is a shadow request
      const isShadow = deployment.mode === 'shadow';

      // For canary, apply traffic percentage
      if (deployment.mode === 'canary') {
        const shouldRoute = Math.random() * 100 < deployment.trafficPercentage;
        if (!shouldRoute) {
          return null;
        }
      }

      return {
        model,
        version,
        deployment,
        policyProfile,
        routingRule: metadata.routingRule,
        tenantBinding: metadata.tenantBinding,
        isShadow,
      };
    } catch (error) {
      this.log.warn({
        message: 'Failed to select model version',
        modelVersionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Evaluate if a routing rule matches the context
   */
  private evaluateRoutingRule(rule: RoutingRule, context: SelectionContext): boolean {
    const results = rule.conditions.map((condition) =>
      this.evaluateCondition(condition, context),
    );

    if (rule.conditionLogic === 'all') {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }

  /**
   * Evaluate a single routing condition
   */
  private evaluateCondition(condition: RoutingCondition, context: SelectionContext): boolean {
    let actualValue: string | string[] | undefined;

    switch (condition.field) {
      case 'tenant_id':
        actualValue = context.tenantId;
        break;
      case 'user_id':
        actualValue = context.userId;
        break;
      case 'capability':
        actualValue = context.capability;
        break;
      case 'feature':
        actualValue = context.featureFlags;
        break;
      case 'tag':
        // This would need model context, skip for now
        return false;
      case 'header':
        // Headers are key-value, need special handling
        return false;
      case 'custom':
        // Custom field handling would go here
        return false;
      default:
        return false;
    }

    if (actualValue === undefined) {
      return false;
    }

    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return actualValue === conditionValue;
      case 'not_equals':
        return actualValue !== conditionValue;
      case 'in':
        if (Array.isArray(conditionValue)) {
          return conditionValue.includes(actualValue as string);
        }
        return false;
      case 'not_in':
        if (Array.isArray(conditionValue)) {
          return !conditionValue.includes(actualValue as string);
        }
        return false;
      case 'contains':
        if (Array.isArray(actualValue)) {
          return actualValue.includes(conditionValue as string);
        }
        return (actualValue as string).includes(conditionValue as string);
      case 'starts_with':
        return (actualValue as string).startsWith(conditionValue as string);
      case 'ends_with':
        return (actualValue as string).endsWith(conditionValue as string);
      case 'regex':
        try {
          const regex = new RegExp(conditionValue as string);
          return regex.test(actualValue as string);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Record a successful model invocation (for circuit breaker)
   */
  recordSuccess(modelVersionId: string): void {
    const state = getCircuitBreakerState(modelVersionId);

    if (state.state === 'half-open') {
      state.successCount++;
      // After enough successes, close the circuit
      if (state.successCount >= 5) {
        state.state = 'closed';
        state.failureCount = 0;
        this.log.info({
          message: 'Circuit breaker closed',
          modelVersionId,
        });
      }
    } else if (state.state === 'closed') {
      // Reset failure count on success
      state.failureCount = 0;
    }
  }

  /**
   * Record a failed model invocation (for circuit breaker)
   */
  recordFailure(modelVersionId: string, config?: DeploymentConfig): void {
    const state = getCircuitBreakerState(modelVersionId);

    state.failureCount++;
    state.lastFailureTime = Date.now();

    const threshold = config?.circuitBreaker.failureRateThreshold || 50;
    const minCalls = config?.circuitBreaker.minimumNumberOfCalls || 10;

    // Simple failure count-based circuit breaker
    if (state.failureCount >= minCalls) {
      state.state = 'open';
      this.log.warn({
        message: 'Circuit breaker opened',
        modelVersionId,
        failureCount: state.failureCount,
      });
    }
  }

  /**
   * Get shadow model for dual-evaluation
   */
  async getShadowModel(
    primaryModelVersionId: string,
    context: SelectionContext,
  ): Promise<SelectedModel | null> {
    // Find shadow deployments for the same capability
    const modelsWithVersions = await modelRegistry.getActiveVersionsForCapability(context.capability);

    for (const { model, version } of modelsWithVersions) {
      if (version.id === primaryModelVersionId) {
        continue;
      }

      const deployment = await deploymentRegistry.getDeploymentConfigForEnvironment(
        version.id,
        'production',
      );

      if (deployment && deployment.isActive && deployment.mode === 'shadow') {
        let policyProfile: PolicyProfile | undefined;
        if (deployment.policyProfileId) {
          policyProfile = await policyRegistry.getPolicyProfile(deployment.policyProfileId);
        }

        return {
          model,
          version,
          deployment,
          policyProfile,
          isShadow: true,
        };
      }
    }

    return null;
  }
}

// Export singleton instance
export const modelSelectionService = new ModelSelectionService();
