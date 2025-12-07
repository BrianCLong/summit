import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export enum PolicyEffect {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
}

export interface PolicyDecision {
  effect: PolicyEffect;
  reason: string;
  policyId?: string;
  ruleId?: string;
  metadata?: Record<string, any>;
}

export interface PolicyContext {
  subject: {
    id: string;
    role: string;
    tenantId: string;
    groups?: string[];
    [key: string]: any;
  };
  resource: {
    type: string;
    id?: string;
    tenantId?: string;
    [key: string]: any;
  };
  action: string;
  environment?: {
    time: Date;
    ip?: string;
    [key: string]: any;
  };
  warrant?: {
    id: string;
    authority: string;
    justification: string;
    [key: string]: any;
  };
}

export interface PolicyRule {
  id: string;
  description: string;
  priority: number; // Higher number = higher priority
  condition: (context: PolicyContext) => boolean;
  effect: PolicyEffect;
  reason: string;
}

export class PolicyEngine extends EventEmitter {
  private rules: PolicyRule[] = [];
  private static instance: PolicyEngine;

  private constructor() {
    super();
    this.loadDefaultRules();
  }

  public static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  private loadDefaultRules() {
    // 1. Tenant Isolation (Critical)
    this.addRule({
      id: 'tenant-isolation',
      description: 'Users can only access resources in their own tenant',
      priority: 100,
      effect: PolicyEffect.DENY,
      reason: 'Cross-tenant access is strictly forbidden',
      condition: (ctx) => {
        if (!ctx.resource.tenantId) return false; // If resource has no tenant, skip this check (e.g. public)
        return ctx.subject.tenantId !== ctx.resource.tenantId && ctx.subject.role !== 'SUPER_ADMIN';
      }
    });

    // 2. Warrant Requirement for Sensitive Operations
    this.addRule({
      id: 'warrant-check',
      description: 'Sensitive operations require a valid warrant/authority',
      priority: 90,
      effect: PolicyEffect.DENY,
      reason: 'Sensitive operation requires a valid warrant',
      condition: (ctx) => {
        const sensitiveActions = ['intercept', 'decrypt', 'surveil', 'export-bulk'];
        if (sensitiveActions.includes(ctx.action)) {
            return !ctx.warrant;
        }
        return false;
      }
    });

    // 3. RBAC (Simplified)
    this.addRule({
      id: 'rbac-viewer',
      description: 'Viewers can only read',
      priority: 50,
      effect: PolicyEffect.DENY,
      reason: 'Viewers cannot perform write operations',
      condition: (ctx) => {
        return ctx.subject.role === 'VIEWER' && ctx.action !== 'read';
      }
    });

    // Default Allow if no Deny rules match? Or Default Deny?
    // Here we will use a Priority-First strategy.

    // Let's add a catch-all explicit allow for valid flows to make this simpler for now
    this.addRule({
      id: 'allow-same-tenant-read',
      description: 'Allow read within same tenant',
      priority: 10,
      effect: PolicyEffect.ALLOW,
      reason: 'Authorized access',
      condition: (ctx) => {
        return ctx.action === 'read' &&
               (ctx.resource.tenantId === ctx.subject.tenantId || !ctx.resource.tenantId);
      }
    });

    this.addRule({
      id: 'allow-admin-all',
      description: 'Admins can do anything in their tenant',
      priority: 10,
      effect: PolicyEffect.ALLOW,
      reason: 'Admin privilege',
      condition: (ctx) => {
        return ctx.subject.role === 'ADMIN' &&
               (ctx.resource.tenantId === ctx.subject.tenantId || !ctx.resource.tenantId);
      }
    });
  }

  public addRule(rule: PolicyRule) {
    this.rules.push(rule);
    // Sort rules by priority DESC
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  public evaluate(context: PolicyContext): PolicyDecision {
    // Evaluation Logic:
    // Iterate rules in priority order (Highest to Lowest).
    // The first rule that matches logic (condition returns true) determines the outcome.

    for (const rule of this.rules) {
      try {
        if (rule.condition(context)) {
            return {
                effect: rule.effect,
                reason: rule.reason,
                policyId: rule.id,
                metadata: { priority: rule.priority }
            };
        }
      } catch (e) {
        console.error(`Error evaluating rule ${rule.id}:`, e);
      }
    }

    // Default Fallback if no rules match
    return {
      effect: PolicyEffect.DENY,
      reason: 'No matching policy found (Default Deny)',
      policyId: 'default-deny'
    };
  }

  public dryRun(context: PolicyContext): PolicyDecision & { trace: any[] } {
    const trace: any[] = [];

    // Evaluate all rules and record results
    for (const rule of this.rules) {
      let matched = false;
      try {
        matched = rule.condition(context);
      } catch (e) {
        trace.push({ ruleId: rule.id, error: e });
        continue;
      }

      if (matched) {
         trace.push({
           ruleId: rule.id,
           effect: rule.effect,
           matched: true,
           priority: rule.priority
         });
      }
    }

    const decision = this.evaluate(context);
    return {
      ...decision,
      trace
    };
  }
}
