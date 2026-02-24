import { ToolCallRequest, PolicyDecision } from './types.js';

export interface PolicyClient {
  evaluate(request: ToolCallRequest): Promise<PolicyDecision>;
}

export class DenyAllPolicyClient implements PolicyClient {
  async evaluate(request: ToolCallRequest): Promise<PolicyDecision> {
    return {
      allowed: false,
      decisionId: 'deny-all',
      reasons: ['Deny by default policy in effect'],
      obligations: []
    };
  }
}
