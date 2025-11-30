
import { AdaptationPlan } from '../loops/types';
import { randomUUID } from 'crypto';

export type GovernanceStatus = 'APPROVED' | 'DENIED' | 'PENDING_APPROVAL';

export interface GovernedAction {
  id: string;
  planId: string;
  actionType: string;
  payload: any;
  status: GovernanceStatus;
  policyId?: string;
  denialReason?: string;
  approvedBy?: string;
  timestamp: Date;
}

export class GovernanceEngine {
  private redLines: Set<string> = new Set([
      'DISABLE_SECURITY_SCANNERS',
      'DELETE_PRODUCTION_DATA',
      'GRANT_ADMIN_ACCESS'
  ]);

  // Mock OPA client
  private async checkOPA(actionType: string, payload: any): Promise<{ allow: boolean; reason?: string }> {
    // Simulate OPA policy
    if (actionType === 'RELAX_SAFETY_RULES' && !payload.approved) {
        return { allow: false, reason: 'Requires explicit human approval to relax safety.' };
    }
    return { allow: true };
  }

  public async reviewPlan(plan: AdaptationPlan): Promise<GovernedAction[]> {
    const governedActions: GovernedAction[] = [];

    for (const action of plan.actions) {
      const ga: GovernedAction = {
        id: randomUUID(),
        planId: plan.id,
        actionType: action.type,
        payload: action.payload,
        status: 'APPROVED', // Optimistic default
        timestamp: new Date()
      };

      // 1. Red Line Check
      if (this.redLines.has(action.type)) {
          ga.status = 'DENIED';
          ga.denialReason = 'Red Line violation: Action is forbidden by hard-coded safety policy.';
          governedActions.push(ga);
          continue;
      }

      // 2. OPA Policy Check
      const opaResult = await this.checkOPA(action.type, action.payload);
      if (!opaResult.allow) {
          ga.status = 'DENIED';
          ga.denialReason = opaResult.reason;
          ga.policyId = 'opa-mock-policy';
      }

      governedActions.push(ga);
    }

    return governedActions;
  }
}
