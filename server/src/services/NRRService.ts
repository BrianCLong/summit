export class NRRService {
  private static instance: NRRService;
  private plans: Map<string, CustomerGrowthPlan> = new Map();

  public static getInstance(): NRRService {
    if (!NRRService.instance) {
      NRRService.instance = new NRRService();
    }
    return NRRService.instance;
  }

  // Mock data storage
  private levers: ExpansionLever[] = [
    { id: 'lever-1', name: 'Additional Seats', type: 'SEATS', description: 'Add more user licenses', isActive: true },
    { id: 'lever-2', name: 'API Usage', type: 'USAGE', description: 'Increase API rate limits', isActive: true },
    { id: 'lever-3', name: 'Cognitive Ops Module', type: 'MODULE', description: 'Advanced AI operations', isActive: true },
    { id: 'lever-4', name: 'SSO & Audit', type: 'FEATURE', description: 'Enterprise governance features', isActive: true },
  ];

  private cohorts: NRRCohort[] = [
    { id: 'cohort-1', name: 'Enterprise Finance', segment: 'Enterprise', industry: 'Finance', nrrTarget: 120, owner: 'Sales Director A' },
    { id: 'cohort-2', name: 'Tech SMB', segment: 'SMB', industry: 'Technology', nrrTarget: 105, owner: 'Sales Director B' },
  ];

  // In a real implementation, these would query a database
  async getNRRMetrics(tenantId: string, period: string): Promise<NRRMetric> {
    // Mock calculation
    return {
      tenantId,
      period,
      newArr: 0,
      expansionArr: 5000,
      contractionArr: 0,
      churnArr: 0,
      netArr: 5000,
      nrrPercentage: 110, // Mock NRR
    };
  }

  async getExpansionLevers(): Promise<ExpansionLever[]> {
    return this.levers;
  }

  async getCohorts(): Promise<NRRCohort[]> {
    return this.cohorts;
  }

  async createGrowthPlan(input: Partial<CustomerGrowthPlan>): Promise<CustomerGrowthPlan> {
    const plan: CustomerGrowthPlan = {
      id: `plan-${Date.now()}`,
      tenantId: input.tenantId || 'unknown',
      currentStage: input.currentStage || 'Discovery',
      desiredOutcomes: input.desiredOutcomes || [],
      blockers: input.blockers || [],
      nextMilestoneDate: input.nextMilestoneDate || new Date(),
      status: input.status || 'ON_TRACK',
    };

    // Store by tenantId for simple retrieval in this prototype
    // In production, this would be stored in a DB and keyed by plan ID and tenant ID
    this.plans.set(plan.tenantId, plan);
    return plan;
  }

  async getGrowthPlan(tenantId: string): Promise<CustomerGrowthPlan | null> {
    return this.plans.get(tenantId) || null;
  }
}

export interface NRRMetric {
  tenantId: string;
  period: string; // "2023-Q1", "2023-01"
  newArr: number;
  expansionArr: number;
  contractionArr: number;
  churnArr: number;
  netArr: number;
  nrrPercentage: number;
}

export interface ExpansionLever {
  id: string;
  name: string;
  type: 'SEATS' | 'USAGE' | 'MODULE' | 'FEATURE' | 'OUTCOME';
  description: string;
  isActive: boolean;
}

export interface NRRCohort {
  id: string;
  name: string;
  segment: string; // "Enterprise", "SMB"
  industry?: string;
  plan?: string;
  nrrTarget: number;
  owner?: string;
}

export interface CustomerGrowthPlan {
  id: string;
  tenantId: string;
  currentStage: string;
  desiredOutcomes: string[];
  blockers: string[];
  nextMilestoneDate: Date;
  status: 'ON_TRACK' | 'AT_RISK' | 'BLOCKED';
}
