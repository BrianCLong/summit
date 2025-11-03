import type { PolicyEvaluationResult } from 'common-types';

export interface FederatedDataNode {
  id: string;
  locality: string;
  privacyBudget: number;
  sensitivityCeiling: number;
  latencyPenaltyMs: number;
  capabilities: string[];
  sovereign?: boolean;
}

export interface SubgraphQueryRequest {
  queryId: string;
  tenantId: string;
  requestedBy: string;
  roles: string[];
  requiredCapabilities: string[];
  preferredLocalities?: string[];
  sensitivity: number;
  estimatedEdges: number;
  privacyBudget: number;
  attributes?: Record<string, string | number | boolean>;
}

export interface SubgraphPlanStep {
  nodeId: string;
  capability: string;
  estimatedLatencyMs: number;
  privacyCost: number;
  locality: string;
  secureAggregation: boolean;
  rationale: string[];
  policy?: PolicyEvaluationResult;
}

export interface SubgraphPlan {
  queryId: string;
  tenantId: string;
  steps: SubgraphPlanStep[];
  residualBudget: number;
  warnings: string[];
}

export class FederatedPlanner {
  private readonly nodes: FederatedDataNode[] = [];

  registerNode(node: FederatedDataNode): void {
    this.nodes.push(node);
  }

  plan(request: SubgraphQueryRequest): SubgraphPlan {
    if (!request.requiredCapabilities.length) {
      throw new Error('at least one capability must be requested');
    }

    const preferred = new Set(request.preferredLocalities ?? []);
    const steps: SubgraphPlanStep[] = [];
    const warnings: string[] = [];
    let remainingBudget = request.privacyBudget;

    for (const capability of request.requiredCapabilities) {
      const candidate = this.selectNode(capability, request.sensitivity, preferred);
      if (!candidate) {
        warnings.push(
          `no node available for capability ${capability} within sensitivity ${request.sensitivity}`,
        );
        continue;
      }

      const baseCost = Math.max(0.05, request.estimatedEdges / 100_000);
      const sovereigntyMultiplier =
        candidate.sovereign && !preferred.has(candidate.locality) ? 1.5 : 1;
      const privacyCost = Number((baseCost * sovereigntyMultiplier).toFixed(4));
      remainingBudget -= privacyCost;

      const rationale = [
        preferred.has(candidate.locality)
          ? 'preferred locality match'
          : 'cross-region placement',
        `latency allowance ${candidate.latencyPenaltyMs}ms`,
      ];

      steps.push({
        nodeId: candidate.id,
        capability,
        estimatedLatencyMs: candidate.latencyPenaltyMs + 25,
        privacyCost,
        locality: candidate.locality,
        secureAggregation: Boolean(candidate.sovereign),
        rationale,
      });
    }

    if (remainingBudget < 0) {
      warnings.push('privacy budget exceeded for requested subgraph query');
    }

    return {
      queryId: request.queryId,
      tenantId: request.tenantId,
      steps,
      residualBudget: Number(Math.max(0, remainingBudget).toFixed(4)),
      warnings,
    };
  }

  private selectNode(
    capability: string,
    sensitivity: number,
    preferred: Set<string>,
  ): FederatedDataNode | undefined {
    const sorted = [...this.nodes].sort((a, b) => {
      const aPref = preferred.has(a.locality) ? 0 : 1;
      const bPref = preferred.has(b.locality) ? 0 : 1;
      if (aPref !== bPref) {
        return aPref - bPref;
      }
      if (a.latencyPenaltyMs !== b.latencyPenaltyMs) {
        return a.latencyPenaltyMs - b.latencyPenaltyMs;
      }
      return b.privacyBudget - a.privacyBudget;
    });

    return sorted.find(
      (node) =>
        node.capabilities.includes(capability) && sensitivity <= node.sensitivityCeiling,
    );
  }
}
