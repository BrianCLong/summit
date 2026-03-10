import type { CapabilityGraph, CapabilityNode, CapabilityEdge } from "./schema.js";

export interface CompileResult {
  ok: boolean;
  violations: string[];
  requiredChecks: string[];
  evidencePlan: string[];
}

export function compileAllowedPlan(graph: CapabilityGraph, requestedPath: string[]): CompileResult {
  const violations: string[] = [];
  const requiredChecks = new Set<string>();
  const evidencePlan = new Set<string>();

  if (!requestedPath || requestedPath.length === 0) {
    return { ok: true, violations, requiredChecks: [], evidencePlan: [] };
  }

  // Canonicalize path: check that nodes exist in graph
  for (const nodeId of requestedPath) {
    if (!graph.nodes.find(n => n.id === nodeId)) {
      violations.push(`Node not found in graph: ${nodeId}`);
    }
  }

  if (violations.length > 0) {
    return { ok: false, violations, requiredChecks: Array.from(requiredChecks), evidencePlan: Array.from(evidencePlan) };
  }

  for (let i = 0; i < requestedPath.length - 1; i++) {
    const from = requestedPath[i];
    const to = requestedPath[i + 1];

    // Check that every hop has an explicit allow=true edge
    const edge = graph.edges.find(e => e.from === from && e.to === to);
    if (!edge) {
      violations.push(`Missing edge from ${from} to ${to}`);
      continue;
    }

    if (!edge.allow) {
      violations.push(`Edge from ${from} to ${to} is explicitly denied (allow=false)`);
    } else {
      // Attach required checks and evidence contracts
      edge.requiredChecks.forEach(c => requiredChecks.add(c));
      edge.evidenceKinds.forEach(e => evidencePlan.add(e));
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    requiredChecks: Array.from(requiredChecks),
    evidencePlan: Array.from(evidencePlan),
  };
}
