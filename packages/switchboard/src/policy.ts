import { Request } from './types.js';

export interface PolicyDecision {
  allowed: boolean;
  decisionId: string;
  reasons: string[];
  obligations: string[];
}

export interface PolicyClient {
  check(request: Request): Promise<PolicyDecision>;
}

export class DenyAllPolicyClient implements PolicyClient {
  async check(request: Request): Promise<PolicyDecision> {
    return {
      allowed: false,
      decisionId: 'deny-all-default',
      reasons: ['Deny by default policy active'],
      obligations: []
    };
  }
}

export class AllowAllPolicyClient implements PolicyClient {
  async check(request: Request): Promise<PolicyDecision> {
    return {
      allowed: true,
      decisionId: 'allow-all-debug',
      reasons: ['Debug allow all'],
      obligations: []
    };
  }
}
