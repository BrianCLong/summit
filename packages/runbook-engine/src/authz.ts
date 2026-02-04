/**
 * Authorization Integration
 *
 * Integrates with the platform's authz service to enforce
 * step-level and runbook-level permissions.
 */

import { ExecutionContext, StepDefinition } from './types';

/**
 * Authorization decision
 */
export interface AuthzDecision {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason if denied */
  reason?: string;
  /** Required permissions */
  requiredPermissions?: string[];
}

/**
 * Authorization client interface
 */
export interface AuthzClient {
  /**
   * Check if user can execute a runbook
   */
  canExecuteRunbook(
    tenantId: string,
    userId: string,
    runbookId: string
  ): Promise<AuthzDecision>;

  /**
   * Check if user can execute a specific step
   */
  canExecuteStep(
    tenantId: string,
    userId: string,
    stepId: string,
    stepType: string,
    context: ExecutionContext
  ): Promise<AuthzDecision>;

  /**
   * Check if user can pause/resume/cancel execution
   */
  canControlExecution(
    tenantId: string,
    userId: string,
    executionId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<AuthzDecision>;

  /**
   * Check if user can view execution details
   */
  canViewExecution(
    tenantId: string,
    userId: string,
    executionId: string
  ): Promise<AuthzDecision>;

  /**
   * Check if user can approve a step
   */
  canApproveStep(
    tenantId: string,
    userId: string,
    executionId: string,
    stepId: string
  ): Promise<AuthzDecision>;
}

/**
 * Mock authz client for development/testing
 */
export class MockAuthzClient implements AuthzClient {
  async canExecuteRunbook(
    tenantId: string,
    userId: string,
    runbookId: string
  ): Promise<AuthzDecision> {
    // In dev mode, allow everything
    return { allowed: true };
  }

  async canExecuteStep(
    tenantId: string,
    userId: string,
    stepId: string,
    stepType: string,
    context: ExecutionContext
  ): Promise<AuthzDecision> {
    // Check if user is authorized based on legal basis
    const authorizedUsers = context.legalBasis.authorizedUsers || [];
    const isAuthorized = authorizedUsers.includes(userId);

    if (!isAuthorized) {
      return {
        allowed: false,
        reason: `User ${userId} is not authorized for this execution`,
        requiredPermissions: ['execution:authorized'],
      };
    }

    return { allowed: true };
  }

  async canControlExecution(
    tenantId: string,
    userId: string,
    executionId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<AuthzDecision> {
    // In dev mode, allow control operations
    return { allowed: true };
  }

  async canViewExecution(
    tenantId: string,
    userId: string,
    executionId: string
  ): Promise<AuthzDecision> {
    return { allowed: true };
  }

  async canApproveStep(
    tenantId: string,
    userId: string,
    executionId: string,
    stepId: string
  ): Promise<AuthzDecision> {
    return { allowed: true };
  }
}

/**
 * OPA-based authz client (production)
 */
export class OPAAuthzClient implements AuthzClient {
  private opaEndpoint: string;

  constructor(opaEndpoint: string = 'http://localhost:8181') {
    this.opaEndpoint = opaEndpoint;
  }

  async canExecuteRunbook(
    tenantId: string,
    userId: string,
    runbookId: string
  ): Promise<AuthzDecision> {
    return this.queryOPA('runbook/execute', {
      tenantId,
      userId,
      runbookId,
    });
  }

  async canExecuteStep(
    tenantId: string,
    userId: string,
    stepId: string,
    stepType: string,
    context: ExecutionContext
  ): Promise<AuthzDecision> {
    return this.queryOPA('step/execute', {
      tenantId,
      userId,
      stepId,
      stepType,
      legalBasis: context.legalBasis,
    });
  }

  async canControlExecution(
    tenantId: string,
    userId: string,
    executionId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<AuthzDecision> {
    return this.queryOPA('execution/control', {
      tenantId,
      userId,
      executionId,
      action,
    });
  }

  async canViewExecution(
    tenantId: string,
    userId: string,
    executionId: string
  ): Promise<AuthzDecision> {
    return this.queryOPA('execution/view', {
      tenantId,
      userId,
      executionId,
    });
  }

  async canApproveStep(
    tenantId: string,
    userId: string,
    executionId: string,
    stepId: string
  ): Promise<AuthzDecision> {
    return this.queryOPA('step/approve', {
      tenantId,
      userId,
      executionId,
      stepId,
    });
  }

  /**
   * Query OPA for authorization decision
   */
  private async queryOPA(
    policy: string,
    input: Record<string, any>
  ): Promise<AuthzDecision> {
    try {
      const response = await fetch(`${this.opaEndpoint}/v1/data/${policy}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error(`OPA request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.result || {};

      return {
        allowed: result.allowed === true,
        reason: result.reason,
        requiredPermissions: result.requiredPermissions,
      };
    } catch (error) {
      console.error('OPA query failed:', error);
      // Fail closed - deny access on error
      return {
        allowed: false,
        reason: 'Authorization service unavailable',
      };
    }
  }
}

/**
 * Authz middleware for engine
 */
export class AuthzMiddleware {
  constructor(private authzClient: AuthzClient) {}

  /**
   * Check authorization before step execution
   */
  async authorizeStep(
    step: StepDefinition,
    context: ExecutionContext
  ): Promise<void> {
    const decision = await this.authzClient.canExecuteStep(
      context.tenantId,
      context.initiatedBy,
      step.id,
      step.type,
      context
    );

    if (!decision.allowed) {
      throw new Error(
        `Authorization denied for step ${step.id}: ${decision.reason}`
      );
    }
  }

  /**
   * Check authorization before runbook execution
   */
  async authorizeRunbook(
    runbookId: string,
    context: ExecutionContext
  ): Promise<void> {
    const decision = await this.authzClient.canExecuteRunbook(
      context.tenantId,
      context.initiatedBy,
      runbookId
    );

    if (!decision.allowed) {
      throw new Error(
        `Authorization denied for runbook ${runbookId}: ${decision.reason}`
      );
    }
  }

  /**
   * Check authorization for control operations
   */
  async authorizeControl(
    executionId: string,
    userId: string,
    tenantId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<void> {
    const decision = await this.authzClient.canControlExecution(
      tenantId,
      userId,
      executionId,
      action
    );

    if (!decision.allowed) {
      throw new Error(
        `Authorization denied for ${action} on execution ${executionId}: ${decision.reason}`
      );
    }
  }
}
