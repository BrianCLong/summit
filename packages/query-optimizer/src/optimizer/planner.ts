import { CostEstimate, OptimizerResult, PlanNode, OptimizationHint } from "../types";
import { GraphCostModel } from "./cost-model";

export class GraphQueryPlanner {
  private costModel: GraphCostModel;

  constructor(costModel?: GraphCostModel) {
    this.costModel = costModel || new GraphCostModel();
  }

  explain(
    query: string,
    hints: OptimizationHint[] = [],
    policyContext?: { tenantId: string }
  ): OptimizerResult {
    const cost = this.costModel.estimateCost(query, policyContext);

    // Simulate plan generation based on query structure
    const plan = this.generatePlanNode(query, cost);

    // Apply hints (simulated)
    const appliedHints = hints.filter((h) => {
      // Basic logic to simulate hint application
      if (h.type === "FORCE_INDEX" && query.includes(h.target || "")) {
        cost.totalCost *= 0.8; // Reduce cost if index forced and present
        return true;
      }
      if (h.type === "AVOID_CROSS_TENANT" && cost.policyPenalty && cost.policyPenalty > 0) {
        // If we avoid cross tenant, we assume the query is rewritten or failed safely
        // For explain purposes, we show the penalty remains unless rewritten
        return true;
      }
      return false;
    });

    return {
      plan,
      cost,
      alternativesDropped: 2, // Mock metric
      appliedHints,
    };
  }

  private generatePlanNode(query: string, cost: CostEstimate): PlanNode {
    // Very rudimentary parser to build a tree
    // In a real system, this would come from the Neo4j driver's EXPLAIN or a proper AST

    const root: PlanNode = {
      operator: "ProduceResults",
      estimatedRows: 10, // Mock
      estimatedCost: cost.totalCost,
      children: [],
    };

    if (query.match(/MATCH/i)) {
      const matchNode: PlanNode = {
        operator: "Match",
        estimatedRows: 100,
        estimatedCost: cost.totalCost * 0.8,
        children: [],
      };

      if (query.match(/WHERE/i)) {
        const filterNode: PlanNode = {
          operator: "Filter",
          estimatedRows: 50,
          estimatedCost: cost.totalCost * 0.4,
          arguments: { expression: "WHERE clause" },
        };
        matchNode.children?.push(filterNode);

        // Leaf node scan
        filterNode.children = [
          {
            operator: "NodeScan",
            estimatedRows: 1000,
            estimatedCost: cost.totalCost * 0.1,
            identifiers: ["n"],
          },
        ];
      } else {
        matchNode.children?.push({
          operator: "NodeScan",
          estimatedRows: 1000,
          estimatedCost: cost.totalCost * 0.2,
          identifiers: ["n"],
        });
      }

      root.children?.push(matchNode);
    }

    if (cost.policyPenalty && cost.policyPenalty > 1000) {
      root.safetyNotes = [
        "HIGH RISK: Potential Cross-Tenant Leakage or Cartesian Product detected.",
      ];
    }

    return root;
  }
}
