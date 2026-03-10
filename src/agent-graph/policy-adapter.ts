import type { CapabilityGraph, CapabilityNode, CapabilityEdge } from "./schema.js";

// A mock policy rule representation
export interface PolicyRule {
  resource: string;
  action: string;
  effect: "allow" | "deny";
  conditions?: Record<string, string>;
}

export function adaptPolicyToGraph(rules: PolicyRule[], baseGraph: CapabilityGraph): CapabilityGraph {
  const newGraph: CapabilityGraph = {
    version: baseGraph.version,
    nodes: [...baseGraph.nodes],
    edges: [...baseGraph.edges],
  };

  // Here, we would map OPA/ABAC policies into graph permissions.
  // For MWS, we apply deny rules to matching edges.
  for (const rule of rules) {
    if (rule.effect === "deny") {
      newGraph.edges = newGraph.edges.map(edge => {
        if (edge.to === rule.resource && edge.from === rule.action /* simplified mapping */) {
          return { ...edge, allow: false };
        }
        return edge;
      });
    }
  }

  return newGraph;
}
