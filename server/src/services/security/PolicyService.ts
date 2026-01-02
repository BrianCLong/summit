import { AuditService } from './AuditService.js';
import { evaluate as evaluateAccess } from '../AccessControl.js';

export interface PolicyInput {
  action: string;
  user: any;
  resource?: any;
  env?: any;
}

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
  obligations?: string[];
}

export class PolicyService {
  /**
   * Evaluates a policy decision.
   * Currently wraps the existing AccessControl logic but provides a generic interface.
   */
  static async evaluate(input: PolicyInput): Promise<PolicyDecision> {
    const start = Date.now();

    // Use existing evaluation logic
    const decision = await evaluateAccess(
      input.action,
      input.user,
      input.resource || {},
      input.env || {}
    );

    // Default deny if decision is null/undefined
    const result: PolicyDecision = {
      allow: decision?.allow || false,
      reason: (decision as any)?.reason || 'No matching policy allowed this action',
      obligations: []
    };

    // Audit the decision
    await AuditService.log({
      userId: input.user?.id,
      action: 'POLICY_EVALUATION',
      resourceType: 'policy',
      resourceId: input.action,
      details: {
        input: {
          action: input.action,
          resourceId: input.resource?.id,
          resourceType: input.resource?.type
        },
        decision: result,
        durationMs: Date.now() - start
      }
    });

    return result;
  }
}
