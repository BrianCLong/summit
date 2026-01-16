/**
 * Tenant Isolation & Policy Simulator Service
 *
 * Safe, deterministic policy evaluation for testing authorization decisions
 * WITHOUT touching production data or secrets.
 */

import logger from '../config/logger.js';

const simLogger = logger.child({ module: 'tenant-policy-simulator' });

export interface SimulationInput {
  tenantId: string;
  actor: {
    id: string;
    roles: string[];
  };
  action: string;
  resource: {
    type: string;
    id: string;
    attributes?: Record<string, any>;
  };
  context?: Record<string, any>;
}

export interface SimulationResult {
  decision: 'allow' | 'deny';
  ruleId?: string;
  reasons?: string[];
  evaluatedAt: string;
  trace?: {
    steps: Array<{
      rule: string;
      matched: boolean;
      reason: string;
    }>;
  };
}

export interface PolicyFixture {
  id: string;
  name: string;
  description: string;
  input: SimulationInput;
  expectedDecision: 'allow' | 'deny';
}

/**
 * Core policy evaluation logic
 * This implements a simplified ABAC model similar to OPA
 */
class TenantPolicySimulator {

  /**
   * Simulate a policy decision based on input only (no DB access)
   */
  async simulate(input: SimulationInput): Promise<SimulationResult> {
    const startTime = Date.now();
    const trace: SimulationResult['trace'] = { steps: [] };

    try {
      // Validation
      this.validateInput(input);

      // Rule evaluation order (similar to OPA)
      const steps = [
        this.evaluateTenantIsolation(input),
        this.evaluateRolePermissions(input),
        this.evaluateResourceOwnership(input),
        this.evaluateActionPermissions(input),
      ];

      for (const step of steps) {
        trace.steps.push(step);
        if (!step.matched) {
          // Explicit deny
          return {
            decision: 'deny',
            ruleId: step.rule,
            reasons: [step.reason],
            evaluatedAt: new Date().toISOString(),
            trace,
          };
        }
      }

      // All rules passed
      return {
        decision: 'allow',
        ruleId: 'abac.allow',
        reasons: ['All authorization checks passed'],
        evaluatedAt: new Date().toISOString(),
        trace,
      };

    } catch (error: any) {
      simLogger.error('Simulation error', { error: error.message, input });
      return {
        decision: 'deny',
        ruleId: 'error',
        reasons: [`Simulation error: ${error.message}`],
        evaluatedAt: new Date().toISOString(),
        trace,
      };
    } finally {
      simLogger.info('Simulation completed', {
        tenantId: input.tenantId,
        action: input.action,
        resourceType: input.resource.type,
        durationMs: Date.now() - startTime,
      });
    }
  }

  /**
   * Get predefined test fixtures
   */
  getFixtures(): PolicyFixture[] {
    return [
      {
        id: 'allow-admin-read',
        name: 'Admin can read any resource',
        description: 'Admins have full access to all resources',
        input: {
          tenantId: 'tenant-001',
          actor: { id: 'user-admin', roles: ['admin'] },
          action: 'read',
          resource: { type: 'case', id: 'case-123' },
        },
        expectedDecision: 'allow',
      },
      {
        id: 'deny-cross-tenant',
        name: 'Cross-tenant access denied',
        description: 'Users cannot access resources from other tenants',
        input: {
          tenantId: 'tenant-001',
          actor: { id: 'user-analyst', roles: ['analyst'] },
          action: 'read',
          resource: {
            type: 'case',
            id: 'case-456',
            attributes: { tenantId: 'tenant-002' },
          },
        },
        expectedDecision: 'deny',
      },
      {
        id: 'allow-analyst-read-own-tenant',
        name: 'Analyst can read resources in own tenant',
        description: 'Analysts can read resources they own',
        input: {
          tenantId: 'tenant-001',
          actor: { id: 'user-analyst', roles: ['analyst'] },
          action: 'read',
          resource: {
            type: 'case',
            id: 'case-789',
            attributes: { tenantId: 'tenant-001', ownerId: 'user-analyst' },
          },
        },
        expectedDecision: 'allow',
      },
      {
        id: 'deny-viewer-write',
        name: 'Viewer cannot write',
        description: 'Viewers have read-only access',
        input: {
          tenantId: 'tenant-001',
          actor: { id: 'user-viewer', roles: ['viewer'] },
          action: 'write',
          resource: {
            type: 'case',
            id: 'case-101',
            attributes: { tenantId: 'tenant-001' },
          },
        },
        expectedDecision: 'deny',
      },
      {
        id: 'allow-operator-manage-workflows',
        name: 'Operator can manage workflows',
        description: 'Operators have workflow management permissions',
        input: {
          tenantId: 'tenant-001',
          actor: { id: 'user-ops', roles: ['operator'] },
          action: 'workflow:manage',
          resource: {
            type: 'workflow',
            id: 'workflow-001',
            attributes: { tenantId: 'tenant-001' },
          },
        },
        expectedDecision: 'allow',
      },
      {
        id: 'deny-analyst-delete-evidence',
        name: 'Analyst cannot delete evidence',
        description: 'Only admins can delete evidence',
        input: {
          tenantId: 'tenant-001',
          actor: { id: 'user-analyst', roles: ['analyst'] },
          action: 'delete',
          resource: {
            type: 'evidence',
            id: 'evidence-001',
            attributes: { tenantId: 'tenant-001' },
          },
        },
        expectedDecision: 'deny',
      },
    ];
  }

  /**
   * Run all fixtures and return results
   */
  async runFixtures(): Promise<Array<{
    fixture: PolicyFixture;
    result: SimulationResult;
    passed: boolean;
  }>> {
    const fixtures = this.getFixtures();
    const results = [];

    for (const fixture of fixtures) {
      const result = await this.simulate(fixture.input);
      const passed = result.decision === fixture.expectedDecision;
      results.push({ fixture, result, passed });
    }

    return results;
  }

  // ========================================================================
  // Private Rule Evaluation Methods
  // ========================================================================

  private validateInput(input: SimulationInput): void {
    if (!input.tenantId || typeof input.tenantId !== 'string') {
      throw new Error('Valid tenantId is required');
    }
    if (!input.actor?.id || !Array.isArray(input.actor.roles)) {
      throw new Error('Valid actor with id and roles is required');
    }
    if (!input.action || typeof input.action !== 'string') {
      throw new Error('Valid action is required');
    }
    if (!input.resource?.type || !input.resource?.id) {
      throw new Error('Valid resource with type and id is required');
    }
  }

  private evaluateTenantIsolation(input: SimulationInput) {
    // Rule: Cross-tenant access is denied unless admin
    const resourceTenantId = input.resource.attributes?.tenantId;
    const isAdmin = input.actor.roles.includes('admin');

    if (resourceTenantId && resourceTenantId !== input.tenantId && !isAdmin) {
      return {
        rule: 'tenant_isolation',
        matched: false,
        reason: `Cross-tenant access denied: resource belongs to ${resourceTenantId}, but request is from ${input.tenantId}`,
      };
    }

    return {
      rule: 'tenant_isolation',
      matched: true,
      reason: 'Tenant isolation check passed',
    };
  }

  private evaluateRolePermissions(input: SimulationInput) {
    // Rule: Check if role exists and is valid
    const validRoles = ['admin', 'operator', 'analyst', 'viewer'];
    const hasValidRole = input.actor.roles.some(r => validRoles.includes(r));

    if (!hasValidRole) {
      return {
        rule: 'role_validation',
        matched: false,
        reason: `No valid roles found. Actor roles: ${input.actor.roles.join(', ')}`,
      };
    }

    return {
      rule: 'role_validation',
      matched: true,
      reason: `Valid roles found: ${input.actor.roles.join(', ')}`,
    };
  }

  private evaluateResourceOwnership(input: SimulationInput) {
    // Rule: Non-admins can only access resources they own (unless operator reading)
    const isAdmin = input.actor.roles.includes('admin');
    const isOperator = input.actor.roles.includes('operator');
    const resourceOwnerId = input.resource.attributes?.ownerId;
    const isOwner = resourceOwnerId === input.actor.id;
    const isReadAction = ['read', 'get', 'list'].some(a => input.action.toLowerCase().includes(a));

    // Admins bypass ownership checks
    if (isAdmin) {
      return {
        rule: 'resource_ownership',
        matched: true,
        reason: 'Admin role bypasses ownership checks',
      };
    }

    // If resource has ownerId, non-owner non-operators cannot access for write
    if (resourceOwnerId && !isOwner && !isReadAction && !isOperator) {
      return {
        rule: 'resource_ownership',
        matched: false,
        reason: `Resource is owned by ${resourceOwnerId}, but actor is ${input.actor.id}`,
      };
    }

    return {
      rule: 'resource_ownership',
      matched: true,
      reason: isOwner ? 'Actor owns resource' : 'No ownership restriction for this action',
    };
  }

  private evaluateActionPermissions(input: SimulationInput) {
    // Rule: Check if role has permission for action
    const role = input.actor.roles[0]; // Use primary role
    const action = input.action.toLowerCase();
    const resourceType = input.resource.type;

    // Admin can do everything
    if (input.actor.roles.includes('admin')) {
      return {
        rule: 'action_permissions',
        matched: true,
        reason: 'Admin has all permissions',
      };
    }

    // Viewer: read-only
    if (role === 'viewer') {
      const isReadAction = ['read', 'get', 'list', 'view'].some(a => action.includes(a));
      if (!isReadAction) {
        return {
          rule: 'action_permissions',
          matched: false,
          reason: `Viewer role cannot perform action: ${action}`,
        };
      }
    }

    // Operator: can manage workflows, tasks, but not delete evidence
    if (role === 'operator') {
      if (action === 'delete' && resourceType === 'evidence') {
        return {
          rule: 'action_permissions',
          matched: false,
          reason: 'Operator cannot delete evidence',
        };
      }
    }

    // Analyst: cannot delete, cannot manage admin resources
    if (role === 'analyst') {
      if (action === 'delete') {
        return {
          rule: 'action_permissions',
          matched: false,
          reason: 'Analyst cannot delete resources',
        };
      }
      if (resourceType === 'tenant' || resourceType === 'user') {
        return {
          rule: 'action_permissions',
          matched: false,
          reason: 'Analyst cannot manage tenant or user resources',
        };
      }
    }

    return {
      rule: 'action_permissions',
      matched: true,
      reason: `Role ${role} has permission for action ${action} on ${resourceType}`,
    };
  }
}

// Singleton instance
export const tenantPolicySimulator = new TenantPolicySimulator();
