import { randomUUID } from 'node:crypto';

import {
  CooperationMode,
  PolicyTag,
  RouterBid,
  RoutingDecision,
  TaskSpec,
} from '@ga-graphai/common-types';

import { CapabilityRegistry, ResourceAdapter } from './capabilityRegistry.js';
import { scoreSkillOverlap } from './utils.js';

interface RouterOptions {
  qualityFloor?: number;
  costAlertFraction?: number;
}

interface AnnotatedBid {
  resource: ResourceAdapter;
  bid: RouterBid;
  coverage: number;
  density: number;
}

function computeCoverage(
  bid: RouterBid,
  resource: ResourceAdapter,
  tags: PolicyTag[],
): number {
  const tagSkills = tags.map((tag) => tag.split(':')[1] ?? tag);
  const fitTags = bid.fitTags ?? [];
  const matches = fitTags.filter((tag) =>
    tagSkills.includes(tag.toLowerCase()),
  );
  const skillOverlap = scoreSkillOverlap(resource.profile.skills, tagSkills);
  return matches.length + skillOverlap;
}

function computeDensity(
  bid: RouterBid,
  coverage: number,
  task: TaskSpec,
): number {
  const latencyPenalty = Math.max(
    bid.est.latencyMs / task.constraints.latencyP95Ms,
    0.5,
  );
  const costPenalty = Math.max(
    bid.est.costUSD / Math.max(task.constraints.budgetUSD, 0.01),
    0.1,
  );
  return (bid.est.quality * (1 + coverage)) / (latencyPenalty * costPenalty);
}

function chooseMode(task: TaskSpec): CooperationMode {
  const hasHighRisk = task.risks.some((risk) => risk.severity === 'high');
  const highAC = task.acceptanceCriteria.length >= 3;
  if (hasHighRisk && task.policy.pii) {
    return 'counterfactual-shadowing';
  }
  if (hasHighRisk) {
    return 'causal-challenge-games';
  }
  if (highAC) {
    return 'semantic-braid';
  }
  if (task.policyTags.includes('license:restricted')) {
    return 'federated-deliberation';
  }
  return 'auction-of-experts';
}

export class PolicyRouter {
  private readonly qualityFloor: number;
  private readonly costAlertFraction: number;

  constructor(
    private readonly registry: CapabilityRegistry,
    options: RouterOptions = {},
  ) {
    this.qualityFloor = options.qualityFloor ?? 0.6;
    this.costAlertFraction = options.costAlertFraction ?? 0.8;
  }

  route(task: TaskSpec): RoutingDecision {
    const candidates = this.registry.eligible(task.policy);
    const annotated = this.collectBids(task, candidates)
      .filter((entry) => entry.bid.est.quality >= this.qualityFloor)
      .sort((a, b) => b.density - a.density);

    const selected: AnnotatedBid[] = [];
    let cost = 0;
    let latency = 0;
    const budget = task.constraints.budgetUSD;

    for (const entry of annotated) {
      if (cost + entry.bid.est.costUSD > budget) {
        continue;
      }
      selected.push(entry);
      cost += entry.bid.est.costUSD;
      latency = Math.max(latency, entry.bid.est.latencyMs);
    }

    if (selected.length === 0 && annotated.length > 0) {
      const fallback = annotated[0];
      selected.push(fallback);
      cost = fallback.bid.est.costUSD;
      latency = fallback.bid.est.latencyMs;
    }

    const primaryAssignments = selected
      .slice(0, 1)
      .map((entry) => entry.resource.profile.id);
    const supportAssignments = selected
      .slice(1)
      .map((entry) => entry.resource.profile.id);

    const mode = chooseMode(task);
    const provenanceRef = `router-${task.taskId}-${randomUUID()}`;

    if (cost > budget * this.costAlertFraction) {
      // Future: emit alert via observability stack. For now this surfaces in provenance ref.
    }

    return {
      mode,
      primaryAssignments,
      supportAssignments,
      expectedCostUSD: Number.parseFloat(cost.toFixed(2)),
      expectedLatencyMs: latency,
      provenanceRef,
    };
  }

  private collectBids(
    task: TaskSpec,
    resources: ResourceAdapter[],
  ): AnnotatedBid[] {
    return resources.map((resource) => {
      const bid = resource.bid(task);
      const coverage = computeCoverage(bid, resource, task.policyTags);
      const density = computeDensity(bid, coverage, task);
      return { resource, bid, coverage, density };
    });
  }
}
