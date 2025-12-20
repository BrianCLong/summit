
import { v4 as uuidv4 } from 'uuid';

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  valuePrinciples: string[]; // IDs
  ethicalConstraints: string[]; // IDs
  decisionScope: string[]; // e.g., 'onboarding', 'product_features'
  policyType: 'ALLOW_DENY' | 'SCORING' | 'HUMAN_REVIEW' | 'BOARD_APPROVAL' | 'PHILANTHROPIC_OFFSET';
  enforcementMechanism: 'OPA' | 'MAESTRO' | 'DEPLOYMENT_GATE' | 'CONFIG_RESTRICTION';
  content: any; // The actual policy rule/logic definition
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class GovernancePolicyService {
  private static instance: GovernancePolicyService;
  private policies: Map<string, GovernancePolicy> = new Map();

  private constructor() {}

  public static getInstance(): GovernancePolicyService {
    if (!GovernancePolicyService.instance) {
      GovernancePolicyService.instance = new GovernancePolicyService();
    }
    return GovernancePolicyService.instance;
  }

  public registerPolicy(policy: Omit<GovernancePolicy, 'id' | 'createdAt' | 'updatedAt' | 'version'>): GovernancePolicy {
    const newPolicy: GovernancePolicy = {
      ...policy,
      id: uuidv4(),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.policies.set(newPolicy.id, newPolicy);
    // In a real system, we would persist this to DB and likely sync to OPA
    return newPolicy;
  }

  public getPolicy(id: string): GovernancePolicy | undefined {
    return this.policies.get(id);
  }

  public getAllPolicies(): GovernancePolicy[] {
    return Array.from(this.policies.values());
  }

  public updatePolicy(id: string, updates: Partial<Omit<GovernancePolicy, 'id' | 'createdAt' | 'version'>>): GovernancePolicy {
    const policy = this.policies.get(id);
    if (!policy) throw new Error(`Policy ${id} not found`);

    const updatedPolicy = {
      ...policy,
      ...updates,
      version: policy.version + 1,
      updatedAt: new Date(),
    };
    this.policies.set(id, updatedPolicy);
    return updatedPolicy;
  }
}
