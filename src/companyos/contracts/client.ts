import type { Decision, Org, PolicyContext, PolicyRule } from './types.js';

export interface CompanyOSClient {
  evaluate(context: PolicyContext): Promise<Decision>;
  getOrg(orgId: string): Promise<Org>;
  getPolicies(orgId: string): Promise<PolicyRule[]>;
}
