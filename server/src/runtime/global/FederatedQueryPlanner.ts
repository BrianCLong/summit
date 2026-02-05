
import { logger } from '../../config/logger.js';
import { globalTrafficSteering } from './GlobalTrafficSteering.js';

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
 * Service for Federated Mesh Query Planning (Task #111).
 * Decomposes global queries into regional execution units.
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
   * Uses "Push-Down Reasoning" to optimize execution at the edge.
   */
  public async planQuery(query: string, tenantId: string, params: Record<string, any> = {}): Promise<ExecutionPlan> {
    logger.info({ query, tenantId }, 'FederatedQueryPlanner: Planning execution');

    // 1. Resolve target regions for the tenant
    // In a global mesh, we might need to query the primary and specific secondary regions
    const decision = await globalTrafficSteering.resolveRegion(tenantId);
    const targetRegions = [decision.targetRegion];
    
    // Simulating discovery of data in other regions (e.g. for global investigations)
    if (params.globalSearch === true) {
        targetRegions.push('eu-central-1', 'ap-southeast-1');
    }

    const subQueries: FederatedSubQuery[] = [];

    // 2. Decompose query into regional units with Push-Down Filters
    for (const region of targetRegions) {
      const pushedDownFilters: string[] = [];
      
      // Heuristic: Extract WHERE clauses to push down
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
   * Rewrites a global query to be compatible with regional shard schemas.
   */
  private rewriteForRegion(query: string, region: string): string {
    // Simulated query rewriting
    // e.g. adding region-specific index hints or local schema prefixes
    return `/* Region: ${region} */ ${query}`;
  }
}

export const federatedQueryPlanner = FederatedQueryPlanner.getInstance();
