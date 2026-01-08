import { CostEstimate, PlanNode } from "../types";

export class GraphCostModel {
  private stats: Record<string, { count: number; avgDegree: number }> = {};

  constructor(initialStats?: Record<string, { count: number; avgDegree: number }>) {
    if (initialStats) {
      this.stats = initialStats;
    } else {
      // Default mock stats
      this.stats = {
        Person: { count: 100000, avgDegree: 50 },
        Company: { count: 5000, avgDegree: 20 },
        Transaction: { count: 1000000, avgDegree: 2 },
      };
    }
  }

  estimateCost(query: string, policyContext?: { tenantId: string }): CostEstimate {
    let cpu = 0;
    let io = 0;
    let net = 0;
    let penalty = 0;

    // Very basic heuristic parser
    const matchCount = (query.match(/MATCH/gi) || []).length;
    const whereCount = (query.match(/WHERE/gi) || []).length;
    const returnCount = (query.match(/RETURN/gi) || []).length;

    // Detect patterns
    const hasCartesianProduct = query.match(/MATCH\s+\(.*\)\s*,\s*\(.*\)/i);
    const hasCrossTenantRisk = !query.includes("tenantId") && policyContext?.tenantId;

    // Base costs
    cpu += matchCount * 10;
    io += matchCount * 100; // Random IO assumption
    cpu += whereCount * 5; // Filtering cost
    net += returnCount * 1; // Serialization cost

    // Specific label lookup estimates
    for (const label of Object.keys(this.stats)) {
      if (query.includes(`:${label}`)) {
        const stat = this.stats[label];
        io += Math.log(stat.count) * 10; // Index scan cost approximation
        cpu += stat.avgDegree; // Traversal cost approximation
      }
    }

    // Penalties
    if (hasCartesianProduct) {
      cpu *= 100; // Massive penalty for cartesian products
      penalty += 1000;
    }

    if (hasCrossTenantRisk) {
      penalty += 999999; // Effectively infinite
    }

    return {
      cpuCost: cpu,
      ioCost: io,
      networkCost: net,
      totalCost: cpu + io + net + penalty,
      confidence: 0.5, // Heuristic
      policyPenalty: penalty,
    };
  }

  updateStats(label: string, count: number, avgDegree: number) {
    this.stats[label] = { count, avgDegree };
  }
}
