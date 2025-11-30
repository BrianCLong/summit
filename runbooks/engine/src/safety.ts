/**
 * Safety Guardrails
 *
 * Enforces safety limits and constraints on runbook execution:
 * - Max execution depth (nested runbooks/loops)
 * - Max concurrent steps
 * - Tenant/resource isolation
 * - Rate limiting
 * - Timeout enforcement
 */

import { RunbookDefinition, ExecutionContext, StepDefinition } from './types';

/**
 * Safety configuration
 */
export interface SafetyConfig {
  /** Maximum nesting depth for control flow (loops, conditionals) */
  maxDepth: number;
  /** Maximum concurrent steps per execution */
  maxConcurrentSteps: number;
  /** Maximum total steps per runbook */
  maxTotalSteps: number;
  /** Maximum execution time (milliseconds) */
  maxExecutionTimeMs: number;
  /** Maximum iterations for loops */
  maxLoopIterations: number;
  /** Maximum runbook size (bytes) */
  maxRunbookSizeBytes: number;
  /** Enable strict tenant isolation */
  strictTenantIsolation: boolean;
  /** Rate limit per tenant (executions per minute) */
  rateLimitPerTenant: number;
}

/**
 * Default safety configuration
 */
export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  maxDepth: 10,
  maxConcurrentSteps: 10,
  maxTotalSteps: 1000,
  maxExecutionTimeMs: 60 * 60 * 1000, // 1 hour
  maxLoopIterations: 10000,
  maxRunbookSizeBytes: 1024 * 1024, // 1 MB
  strictTenantIsolation: true,
  rateLimitPerTenant: 100,
};

/**
 * Safety violations
 */
export class SafetyViolationError extends Error {
  constructor(
    message: string,
    public readonly violation: string,
    public readonly limit: number | string,
    public readonly actual: number | string
  ) {
    super(message);
    this.name = 'SafetyViolationError';
  }
}

/**
 * Safety validator
 */
export class SafetyValidator {
  private executionCounts: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(private config: SafetyConfig = DEFAULT_SAFETY_CONFIG) {}

  /**
   * Validate runbook definition against safety constraints
   */
  validateRunbook(runbook: RunbookDefinition): void {
    // Check total step count
    const totalSteps = this.countTotalSteps(runbook.steps);
    if (totalSteps > this.config.maxTotalSteps) {
      throw new SafetyViolationError(
        `Runbook exceeds maximum step count`,
        'max_total_steps',
        this.config.maxTotalSteps,
        totalSteps
      );
    }

    // Check runbook size
    const runbookSize = JSON.stringify(runbook).length;
    if (runbookSize > this.config.maxRunbookSizeBytes) {
      throw new SafetyViolationError(
        `Runbook exceeds maximum size`,
        'max_runbook_size',
        this.config.maxRunbookSizeBytes,
        runbookSize
      );
    }

    // Check nesting depth
    const maxDepth = this.calculateMaxDepth(runbook.steps);
    if (maxDepth > this.config.maxDepth) {
      throw new SafetyViolationError(
        `Runbook exceeds maximum nesting depth`,
        'max_depth',
        this.config.maxDepth,
        maxDepth
      );
    }

    // Validate global timeout
    if (
      runbook.globalTimeoutMs &&
      runbook.globalTimeoutMs > this.config.maxExecutionTimeMs
    ) {
      throw new SafetyViolationError(
        `Runbook global timeout exceeds maximum`,
        'max_execution_time',
        this.config.maxExecutionTimeMs,
        runbook.globalTimeoutMs
      );
    }
  }

  /**
   * Check rate limit for tenant
   */
  checkRateLimit(tenantId: string): void {
    const now = Date.now();
    const tenantData = this.executionCounts.get(tenantId);

    if (!tenantData || now > tenantData.resetAt) {
      // Reset window
      this.executionCounts.set(tenantId, {
        count: 1,
        resetAt: now + 60000, // 1 minute window
      });
      return;
    }

    if (tenantData.count >= this.config.rateLimitPerTenant) {
      throw new SafetyViolationError(
        `Rate limit exceeded for tenant ${tenantId}`,
        'rate_limit',
        this.config.rateLimitPerTenant,
        tenantData.count
      );
    }

    tenantData.count++;
  }

  /**
   * Validate execution context
   */
  validateContext(context: ExecutionContext): void {
    // Validate tenant ID
    if (!context.tenantId || context.tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required');
    }

    // Validate initiated by
    if (!context.initiatedBy || context.initiatedBy.trim().length === 0) {
      throw new Error('initiatedBy is required');
    }

    // Validate legal basis
    if (!context.legalBasis) {
      throw new Error('Legal basis is required');
    }

    if (!context.legalBasis.authority || context.legalBasis.authority.trim().length === 0) {
      throw new Error('Legal basis authority is required');
    }

    if (
      !context.legalBasis.authorizedUsers ||
      context.legalBasis.authorizedUsers.length === 0
    ) {
      throw new Error('At least one authorized user is required');
    }

    // Enforce tenant isolation
    if (this.config.strictTenantIsolation) {
      // Ensure initiator is in authorized users
      if (!context.legalBasis.authorizedUsers.includes(context.initiatedBy)) {
        throw new SafetyViolationError(
          'Initiator must be in authorized users list',
          'tenant_isolation',
          'initiator in authorized list',
          'initiator not authorized'
        );
      }
    }
  }

  /**
   * Count total steps including nested steps
   */
  private countTotalSteps(steps: StepDefinition[]): number {
    let count = steps.length;

    for (const step of steps) {
      const extStep = step as any;

      // Count conditional branches
      if (extStep.branches) {
        for (const branch of extStep.branches) {
          count += this.countTotalSteps(branch.steps);
        }
      }

      // Count loop steps
      if (extStep.loop) {
        count += this.countTotalSteps(extStep.loop.steps);
      }
    }

    return count;
  }

  /**
   * Calculate maximum nesting depth
   */
  private calculateMaxDepth(steps: StepDefinition[], currentDepth: number = 0): number {
    let maxDepth = currentDepth;

    for (const step of steps) {
      const extStep = step as any;

      // Check conditional branches
      if (extStep.branches) {
        for (const branch of extStep.branches) {
          const branchDepth = this.calculateMaxDepth(
            branch.steps,
            currentDepth + 1
          );
          maxDepth = Math.max(maxDepth, branchDepth);
        }
      }

      // Check loops
      if (extStep.loop) {
        const loopDepth = this.calculateMaxDepth(
          extStep.loop.steps,
          currentDepth + 1
        );
        maxDepth = Math.max(maxDepth, loopDepth);
      }
    }

    return maxDepth;
  }

  /**
   * Clear rate limit data (for testing)
   */
  clearRateLimits(): void {
    this.executionCounts.clear();
  }
}

/**
 * Tenant resource tracker
 */
export class TenantResourceTracker {
  private tenantResources: Map<
    string,
    {
      activeExecutions: number;
      totalSteps: number;
      cpuTimeMs: number;
    }
  > = new Map();

  /**
   * Track execution start
   */
  trackExecutionStart(tenantId: string): void {
    const resources = this.getTenantResources(tenantId);
    resources.activeExecutions++;
  }

  /**
   * Track execution end
   */
  trackExecutionEnd(
    tenantId: string,
    stepCount: number,
    cpuTimeMs: number
  ): void {
    const resources = this.getTenantResources(tenantId);
    resources.activeExecutions--;
    resources.totalSteps += stepCount;
    resources.cpuTimeMs += cpuTimeMs;
  }

  /**
   * Get tenant resource usage
   */
  getTenantUsage(tenantId: string): {
    activeExecutions: number;
    totalSteps: number;
    cpuTimeMs: number;
  } {
    return { ...this.getTenantResources(tenantId) };
  }

  /**
   * Get all tenant usage
   */
  getAllTenantUsage(): Map<
    string,
    {
      activeExecutions: number;
      totalSteps: number;
      cpuTimeMs: number;
    }
  > {
    return new Map(this.tenantResources);
  }

  private getTenantResources(tenantId: string) {
    let resources = this.tenantResources.get(tenantId);
    if (!resources) {
      resources = {
        activeExecutions: 0,
        totalSteps: 0,
        cpuTimeMs: 0,
      };
      this.tenantResources.set(tenantId, resources);
    }
    return resources;
  }
}
