import { logger } from '../../config/logger.js';
import { globalTrafficSteering } from './GlobalTrafficSteering.js';
import { differentialPrivacyService } from '../../services/DifferentialPrivacyService.js';

export interface FederatedSubQuery {
  region: string;
  query: string;
  params: Record<string, any>;
  pushedDownFilters: string[];
}

export interface ExecutionPlan {
  originalQuery: string;
  subQueries: FederatedSubQuery[];
  mergeStrategy: 'UNION' | 'JOIN' | 'AGGREGATE';
}

/**
 * Service for Federated Mesh Query Planning (Task #111 & #113).
 * Decomposes global queries into regional execution units and guards results with DP.
 */
export class FederatedQueryPlanner {
  private static instance: FederatedQueryPlanner;

  private constructor() {}

  public static getInstance(): FederatedQueryPlanner {
    if (!FederatedQueryPlanner.instance) {
      FederatedQueryPlanner.instance = new FederatedQueryPlanner();
    }
    return FederatedQueryPlanner.instance;
  }

  /**
   * Plans a global query execution across the region mesh.
   */
  public async planQuery(query: string, tenantId: string, params: Record<string, any> = {}): Promise<ExecutionPlan> {
    logger.info({ query, tenantId }, 'FederatedQueryPlanner: Planning execution');

    const decision = await globalTrafficSteering.resolveRegion(tenantId);
    const targetRegions = [decision.targetRegion];
    
    if (params.globalSearch === true) {
        targetRegions.push('eu-central-1', 'ap-southeast-1');
    }

    const subQueries: FederatedSubQuery[] = [];

    for (const region of targetRegions) {
      const pushedDownFilters: string[] = [];
      
      if (query.includes('WHERE')) {
          pushedDownFilters.push('temporal_filter');
          pushedDownFilters.push('tenant_isolation');
      }

      subQueries.push({
        region,
        query: this.rewriteForRegion(query, region),
        params: { ...params, tenantId },
        pushedDownFilters
      });
    }

    return {
      originalQuery: query,
      subQueries,
      mergeStrategy: query.toLowerCase().includes('count') ? 'AGGREGATE' : 'UNION'
    };
  }

  /**
   * Executes the plan and applies Sovereign Guards (DP).
   */
  public async executeFederatedQuery(plan: ExecutionPlan): Promise<any> {
    // Simulate execution results
    const rawResults = plan.subQueries.map(sq => {
      if (plan.mergeStrategy === 'AGGREGATE') {
        return { region: sq.region, value: Math.floor(Math.random() * 100) };
      }
      return { region: sq.region, data: 'Simulated Result' };
    });

    // If cross-region aggregation, apply Differential Privacy
    if (plan.mergeStrategy === 'AGGREGATE' && plan.subQueries.length > 1) {
      const total = rawResults.reduce((acc: number, curr: any) => acc + curr.value, 0);
      
      // Apply DP to the aggregate
      const guarded = differentialPrivacyService.guardResult(
        { value: total }, 
        'AGGREGATE'
      );
      
      logger.info({ original: total, guarded: guarded.value }, 'FederatedQueryPlanner: Applied DP to sovereign aggregate');
      return guarded;
    }

    return rawResults;
  }

  private rewriteForRegion(query: string, region: string): string {
    return `/* Region: ${region} */ ${query}`;
  }
}

export const federatedQueryPlanner = FederatedQueryPlanner.getInstance();