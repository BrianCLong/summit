export interface PolicySimulationRequest {
  tenantId: string;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  context: Record<string, any>;
}

export interface PolicySimulationResponse {
  decision: 'allow' | 'allow_with_approval' | 'deny';
  reasons: string[];
  requiredApprovers: string[];
  rationaleRequired: boolean;
  policyVersion: string;
}

export class PolicyService {
  private opaUrl: string;

  constructor() {
    this.opaUrl = process.env.OPA_URL || 'http://localhost:8181/v1/data/finance/vendor_payment/decision';
  }

  async simulate(request: PolicySimulationRequest): Promise<PolicySimulationResponse> {
    try {
      const response = await fetch(this.opaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            user: { role: request.userRole, id: request.userId },
            payment: request.context.payment || {},
            tenant_id: request.tenantId,
            resource: request.resource
          }
        })
      }).catch(() => null);

      if (!response || !response.ok) {
         return this.handleLocalSimulation(request);
      }

      const data = await response.json() as any;
      const result = data.result;

      if (!result) {
        return this.getDefaultDeny('No policy result found');
      }

      return {
        decision: result.action,
        reasons: result.reasons || [],
        requiredApprovers: result.required_approvers || [],
        rationaleRequired: result.rationale_required || false,
        policyVersion: 'v0.1.0'
      };
    } catch (error) {
      console.error('Policy simulation failed:', error);
      return this.getDefaultDeny('Internal simulation error');
    }
  }

  private handleLocalSimulation(request: PolicySimulationRequest): PolicySimulationResponse {
    const amount = request.context.payment?.amount || 0;
    const role = request.userRole;

    if (role === 'FinanceAdmin' && amount < 5000) {
      return {
        decision: 'allow',
        reasons: ['Auto-approved for FinanceAdmin under threshold (local mock)'],
        requiredApprovers: [],
        rationaleRequired: false,
        policyVersion: 'local-mock'
      };
    }

    if (role === 'FinanceAdmin' || role === 'FinanceApprover') {
      return {
        decision: 'allow_with_approval',
        reasons: ['Human approval required (local mock)'],
        requiredApprovers: amount > 10000 ? ['FinanceAdmin'] : ['FinanceApprover', 'FinanceAdmin'],
        rationaleRequired: true,
        policyVersion: 'local-mock'
      };
    }

    return this.getDefaultDeny('Policy denied (local mock)');
  }

  private getDefaultDeny(reason: string): PolicySimulationResponse {
    return {
      decision: 'deny',
      reasons: [reason],
      requiredApprovers: [],
      rationaleRequired: false,
      policyVersion: 'fallback'
    };
  }
}
