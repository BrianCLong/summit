import logger from '../../utils/logger.js';
import { AgentTask, PolicyEvaluationResult } from '../orchestration/types.js';
// In a real implementation, we would import the OPA client or similar
// import { evaluate } from '../AccessControl.js';

export interface PolicyContext {
  user?: any;
  agent?: any;
  resource?: any;
  environment?: any;
}

export class PolicyEngine {
  private static instance: PolicyEngine;
  private opaUrl: string;

  private constructor() {
    this.opaUrl = process.env.OPA_URL || 'http://localhost:8181/v1/data/intelgraph/allow';
  }

  public static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  /**
   * Evaluates a policy for a given action and context.
   */
  async evaluate(action: string, context: PolicyContext): Promise<PolicyEvaluationResult> {
    try {
      // 1. RBAC Check (Simplified)
      if (!this.checkRBAC(action, context)) {
        await this.logAudit(action, context, { allowed: false, reason: 'RBAC_DENIED' });
        return { allowed: false, reason: 'Insufficient permissions (RBAC)' };
      }

      // 2. OPA Check (External Policy)
      const opaResult = await this.evaluateOPA(action, context);
      if (!opaResult.allowed) {
        await this.logAudit(action, context, { allowed: false, reason: 'OPA_DENIED: ' + opaResult.reason });
        return opaResult;
      }

      // 3. Custom Logic / Safety Checks (Internal)
      const safetyResult = this.checkSafety(action, context);
      if (!safetyResult.allowed) {
        await this.logAudit(action, context, { allowed: false, reason: 'SAFETY_DENIED: ' + safetyResult.reason });
        return safetyResult;
      }

      await this.logAudit(action, context, { allowed: true });
      return { allowed: true };
    } catch (error: any) {
      logger.error('Policy evaluation failed', { error: error.message, action, context });
      // Fail closed
      return { allowed: false, reason: 'Policy evaluation error' };
    }
  }

  private checkRBAC(action: string, context: PolicyContext): boolean {
    // Simplified RBAC logic
    // In production, this would look up roles and permissions
    const user = context.user;
    if (!user) return true; // System actions might not have a user

    // Example: only admin can terminate agents
    if (action === 'terminate_agent' && !user.roles?.includes('admin')) {
      return false;
    }

    return true;
  }

  private async evaluateOPA(action: string, context: PolicyContext): Promise<PolicyEvaluationResult> {
    if (!process.env.OPA_ENABLED) {
      return { allowed: true }; // Skip if disabled
    }

    try {
      // Mock OPA call using fetch if available or just return allowed for now in prototype
      // const response = await fetch(this.opaUrl, { ... })
      return { allowed: true };
    } catch (e: any) {
      logger.warn('OPA connection failed, failing closed', e);
      return { allowed: false, reason: 'Policy server unavailable' };
    }
  }

  private checkSafety(action: string, context: PolicyContext): PolicyEvaluationResult {
    // High-risk operation checks
    if (action === 'delete_database') {
      return { allowed: false, reason: 'Destructive action not allowed by automated agents' };
    }
    return { allowed: true };
  }

  private async logAudit(action: string, context: PolicyContext, result: PolicyEvaluationResult) {
    // In production, write to immutable ledger or audit log
    logger.info('Policy Audit', {
      timestamp: new Date(),
      action,
      agentId: context.agent?.id,
      userId: context.user?.id,
      result: result.allowed ? 'ALLOW' : 'DENY',
      reason: result.reason
    });
  }
}
