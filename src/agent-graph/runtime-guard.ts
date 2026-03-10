import type { CapabilityGraph } from "./schema.js";
import { compileAllowedPlan } from "./compiler.js";

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  costUsd: number;
  latencyMs: number;
}

export function evaluateRuntimeGuard(graph: CapabilityGraph, requestedPath: string[], maxCost: number, maxDepth: number): GuardResult {
  if (requestedPath.length > maxDepth) {
    return {
      allowed: false,
      reason: `Traversal depth ${requestedPath.length} exceeds maximum allowed depth ${maxDepth}`,
      costUsd: 0,
      latencyMs: 0
    };
  }

  const plan = compileAllowedPlan(graph, requestedPath);
  if (!plan.ok) {
    return {
      allowed: false,
      reason: plan.violations.join(", "),
      costUsd: 0,
      latencyMs: 0
    };
  }

  let totalCost = 0;
  let totalLatency = 0;

  for (let i = 0; i < requestedPath.length - 1; i++) {
    const from = requestedPath[i];
    const to = requestedPath[i + 1];
    const edge = graph.edges.find(e => e.from === from && e.to === to);
    if (edge) {
      totalCost += edge.maxCostUsd || 0;
      totalLatency += edge.maxLatencyMs || 0;
    }
  }

  if (totalCost > maxCost) {
    return {
      allowed: false,
      reason: `Estimated cost $${totalCost} exceeds maximum budget $${maxCost}`,
      costUsd: totalCost,
      latencyMs: totalLatency
    };
  }

  return {
    allowed: true,
    costUsd: totalCost,
    latencyMs: totalLatency
  };
}
