import {
  SHORT_RETENTION,
  analyzeEvidence,
  derivePolicyInput,
  ensureSecret,
  enumerateArtifacts,
  listSinkNodes,
  listSourceNodes,
  normalizeWorkflow,
  type ArtifactBinding,
  type PolicyInput,
  type ValidationDefaults,
  type WhatIfScenario,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowEstimates,
  type WorkflowNode,
  type WorkflowPolicy,
  type WorkflowStaticAnalysis,
  type WorkflowSuggestion,
  type WorkflowValidationIssue,
  type WorkflowValidationResult
} from "common-types";

type SecretScanResult = {
  path: string;
  value: unknown;
} | null;

export interface ValidateOptions {
  allowLoops?: boolean;
  requireEvidence?: boolean;
  defaults?: Partial<ValidationDefaults>;
}

export interface TopologyResult {
  order: string[];
  cycles: string[][];
}

export function validateWorkflow(
  workflow: WorkflowDefinition,
  options: ValidateOptions = {}
): WorkflowValidationResult {
  const normalized = normalizeWorkflow(workflow, {
    evidenceRequired: options.requireEvidence ?? true,
    ...options.defaults
  });

  const issues: WorkflowValidationIssue[] = [];
  const suggestions: WorkflowSuggestion[] = [];
  const nodeMap = new Map<string, WorkflowNode>();
  const seenIds = new Set<string>();

  for (const node of normalized.nodes) {
    if (seenIds.has(node.id)) {
      issues.push({
        severity: "error",
        code: "node.duplicate",
        message: `Duplicate node id detected: ${node.id}`,
        nodes: [node.id]
      });
    }
    seenIds.add(node.id);
    nodeMap.set(node.id, node);

    const secretHit = scanForLiteralSecret(node.params);
    if (secretHit) {
      issues.push({
        severity: "error",
        code: "policy.secret",
        message: `Node ${node.id} contains literal secret at ${secretHit.path}. Use vault refs instead.`,
        nodes: [node.id],
        suggestion: "Replace literal values with {\"vault\":\"vault://path\",\"key\":\"secret\"}."
      });
    }

    if (node.policy?.handlesPii && !normalized.policy.pii) {
      issues.push({
        severity: "error",
        code: "policy.pii",
        message: `Node ${node.id} handles PII but workflow policy does not allow pii processing.`,
        nodes: [node.id]
      });
    }

    if (node.policy?.requiresApproval) {
      const hasApprovalNode = normalized.nodes.some(
        (candidate) => candidate.type === "util.approval"
      );
      if (!hasApprovalNode) {
        issues.push({
          severity: "warning",
          code: "policy.approval",
          message: `Node ${node.id} requires an approval gate but no util.approval node is present.`,
          nodes: [node.id],
          suggestion: "Insert a util.approval node before production deployment steps."
        });
      }
    }

    if (node.estimates?.latencyP95Ms && node.timeoutMs && node.estimates.latencyP95Ms > node.timeoutMs) {
      issues.push({
        severity: "warning",
        code: "slo.timeout",
        message: `Node ${node.id} latency estimate ${node.estimates.latencyP95Ms}ms exceeds timeout ${node.timeoutMs}ms.`,
        nodes: [node.id],
        suggestion: "Increase timeout or reduce workload size."
      });
    }
  }

  for (const edge of normalized.edges) {
    if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
      issues.push({
        severity: "error",
        code: "edge.unknown-node",
        message: `Edge ${edge.from} -> ${edge.to} references unknown nodes`,
        edge
      });
      continue;
    }
    const from = nodeMap.get(edge.from)!;
    const to = nodeMap.get(edge.to)!;
    const incompatibility = validateArtifactCompatibility(from, to);
    if (incompatibility) {
      issues.push({
        severity: "error",
        code: "artifact.mismatch",
        message: incompatibility,
        edge,
        nodes: [from.id, to.id]
      });
    }
  }

  if (normalized.nodes.length > 0) {
    const sources = listSourceNodes(normalized);
    const sinks = listSinkNodes(normalized);
    if (sources.length === 0) {
      issues.push({
        severity: "error",
        code: "topology.no-source",
        message: "Workflow must include at least one source node"
      });
    }
    if (sinks.length === 0) {
      issues.push({
        severity: "error",
        code: "topology.no-sink",
        message: "Workflow must include at least one sink node"
      });
    }
  }

  const topology = topologicalSort(normalized);
  if (topology.cycles.length > 0 && !options.allowLoops) {
    issues.push({
      severity: "error",
      code: "topology.cycle",
      message: `Workflow contains cycle(s): ${topology.cycles
        .map((cycle) => cycle.join(" -> "))
        .join("; ")}`
    });
  } else if (topology.cycles.length > 0) {
    suggestions.push({
      code: "topology.loop",
      title: "Verify loop nodes",
      detail:
        "Workflow contains intentional loops. Ensure loop nodes have exit criteria and bounded iterations.",
      appliesTo: [...new Set(topology.cycles.flat())]
    });
  }

  const sources = listSourceNodes(normalized);
  const sinks = listSinkNodes(normalized);
  const reachable = discoverReachable(normalized, sources);
  const unreachable = normalized.nodes
    .map((node) => node.id)
    .filter((id) => !reachable.has(id));
  if (unreachable.length > 0) {
    issues.push({
      severity: "warning",
      code: "topology.unreachable",
      message: `Unreachable nodes detected: ${unreachable.join(", ")}`,
      nodes: unreachable
    });
  }

  const evidence = analyzeEvidence(normalized.nodes);
  if (evidence.missing.length > 0) {
    issues.push({
      severity: "error",
      code: "evidence.missing",
      message: `Evidence outputs required for nodes: ${evidence.missing.join(", ")}`,
      nodes: evidence.missing,
      suggestion: "Attach provenance or SARIF/SPDX outputs to each node."
    });
  }

  const policyIssues = validatePolicy(normalized.policy, normalized.nodes);
  issues.push(...policyIssues);

  const estimated = computeWorkflowEstimates(normalized, topology.order);
  const budgetSuggestions = suggestBudgetActions(normalized, estimated);
  suggestions.push(...budgetSuggestions);

  if (normalized.constraints.latencyP95Ms > 0 && estimated.latencyP95Ms > normalized.constraints.latencyP95Ms) {
    issues.push({
      severity: "error",
      code: "constraint.latency",
      message: `Estimated latency ${estimated.latencyP95Ms}ms exceeds constraint ${normalized.constraints.latencyP95Ms}ms`,
      nodes: estimated.criticalPath
    });
  } else if (
    normalized.constraints.latencyP95Ms > 0 &&
    estimated.latencyP95Ms > normalized.constraints.latencyP95Ms * 0.8
  ) {
    suggestions.push({
      code: "constraint.latency.headroom",
      title: "Latency headroom is tight",
      detail: `Estimated latency ${estimated.latencyP95Ms}ms is within 20% of the constraint ${normalized.constraints.latencyP95Ms}ms. Consider enabling caching or splitting long-running steps.`,
      appliesTo: estimated.criticalPath,
      estimatedGain: { latencyMs: Math.round(estimated.latencyP95Ms * 0.15) }
    });
  }

  if (normalized.constraints.budgetUSD > 0 && estimated.costUSD > normalized.constraints.budgetUSD) {
    issues.push({
      severity: "error",
      code: "constraint.cost",
      message: `Estimated cost $${estimated.costUSD.toFixed(2)} exceeds budget $${normalized.constraints.budgetUSD.toFixed(2)}`,
      nodes: estimated.criticalPath
    });
  }

  const analysis: WorkflowStaticAnalysis = {
    issues,
    suggestions,
    sources,
    sinks,
    unreachable,
    estimated,
    evidence
  };

  return {
    normalized,
    analysis
  };
}

export function computeWorkflowEstimates(
  workflow: WorkflowDefinition,
  orderOverride?: string[]
): WorkflowEstimates {
  if (workflow.nodes.length === 0) {
    return {
      latencyP95Ms: 0,
      costUSD: 0,
      queueMs: 0,
      successRate: 1,
      criticalPath: []
    };
  }

  const order = orderOverride && orderOverride.length > 0 ? orderOverride : topologicalSort(workflow).order;
  const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node] as const));
  const incoming = buildIncomingMap(workflow.edges);
  const distance = new Map<string, number>();
  const predecessor = new Map<string, string | null>();
  let totalCost = 0;
  let successRateProduct = 1;

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) {
      continue;
    }
    const latency = (node.estimates?.latencyP95Ms ?? 0) + (node.estimates?.queueMs ?? 0);
    totalCost += node.estimates?.costUSD ?? 0;
    if (typeof node.estimates?.successRate === "number") {
      successRateProduct *= node.estimates.successRate;
    }
    let bestDistance = 0;
    let bestPredecessor: string | null = null;
    for (const parent of incoming.get(nodeId) ?? []) {
      const parentDistance = distance.get(parent) ?? 0;
      if (parentDistance >= bestDistance) {
        bestDistance = parentDistance;
        bestPredecessor = parent;
      }
    }
    const nodeDistance = bestDistance + latency;
    distance.set(nodeId, nodeDistance);
    predecessor.set(nodeId, bestPredecessor);
  }

  let anchor = "";
  let maxDistance = 0;
  for (const [nodeId, value] of distance.entries()) {
    if (value >= maxDistance) {
      anchor = nodeId;
      maxDistance = value;
    }
  }

  const criticalPath: string[] = [];
  let queueMs = 0;
  let cursor: string | null = anchor;
  while (cursor) {
    criticalPath.unshift(cursor);
    const node = nodeMap.get(cursor);
    if (node?.estimates?.queueMs) {
      queueMs += node.estimates.queueMs;
    }
    cursor = predecessor.get(cursor) ?? null;
  }

  return {
    latencyP95Ms: Math.round(maxDistance),
    costUSD: Number(totalCost.toFixed(2)),
    queueMs: Math.round(queueMs),
    successRate: Number(successRateProduct.toFixed(4)),
    criticalPath
  };
}

export function topologicalSort(workflow: WorkflowDefinition): TopologyResult {
  const adjacency = buildAdjacency(workflow.edges);
  const inDegree = new Map<string, number>();
  const order: string[] = [];

  for (const node of workflow.nodes) {
    inDegree.set(node.id, 0);
  }

  for (const edge of workflow.edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const node of workflow.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }

  const processed = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) {
      continue;
    }
    order.push(nodeId);
    processed.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const next = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, next);
      if (next === 0) {
        queue.push(neighbor);
      }
    }
  }

  const remaining = new Set<string>();
  for (const node of workflow.nodes) {
    if (!processed.has(node.id)) {
      remaining.add(node.id);
    }
  }

  const cycles = remaining.size > 0 ? detectCycles(adjacency, remaining) : [];

  for (const node of workflow.nodes) {
    if (!order.includes(node.id)) {
      order.push(node.id);
    }
  }

  return { order, cycles };
}


function detectCycles(
  adjacency: Map<string, Set<string>>,
  candidates: Set<string>
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(nodeId: string) {
    stack.push(nodeId);
    visited.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (!candidates.has(neighbor)) {
        continue;
      }
      const cycleIndex = stack.indexOf(neighbor);
      if (cycleIndex >= 0) {
        cycles.push(stack.slice(cycleIndex));
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }
    stack.pop();
  }

  for (const nodeId of candidates) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return cycles;
}

export function planWhatIf(
  workflow: WorkflowDefinition,
  scenario: WhatIfScenario
): WorkflowEstimates {
  const normalized = normalizeWorkflow(workflow);
  const nodes = normalized.nodes.map((node) => ({ ...node }));
  const nodeOverrides = scenario.overrides ?? {};

  for (const node of nodes) {
    const overrides = nodeOverrides[node.id];
    if (overrides) {
      node.estimates = {
        ...node.estimates,
        ...overrides
      };
    }
    if (scenario.parallelismMultiplier && node.parallelism) {
      const multiplier = Math.max(0.1, scenario.parallelismMultiplier);
      const newParallelism = Math.max(1, Math.round(node.parallelism * multiplier));
      node.parallelism = newParallelism;
      if (node.estimates?.latencyP95Ms) {
        node.estimates.latencyP95Ms = Math.max(
          50,
          Math.round(node.estimates.latencyP95Ms / multiplier)
        );
      }
    }
    if (scenario.cacheHitRate && node.estimates?.cacheable && node.estimates.costUSD) {
      const hitRate = Math.min(Math.max(scenario.cacheHitRate, 0), 0.95);
      node.estimates.costUSD = Number(
        (node.estimates.costUSD * (1 - hitRate)).toFixed(2)
      );
    }
  }

  return computeWorkflowEstimates({
    ...normalized,
    nodes
  });
}

export function suggestBudgetActions(
  workflow: WorkflowDefinition,
  estimates: WorkflowEstimates,
  threshold = 0.8
): WorkflowSuggestion[] {
  const suggestions: WorkflowSuggestion[] = [];
  const budget = workflow.constraints.budgetUSD;
  if (budget > 0 && estimates.costUSD >= budget * threshold) {
    suggestions.push({
      code: "budget.watch",
      title: "Budget usage nearing limit",
      detail: `Estimated cost $${estimates.costUSD.toFixed(2)} is at or above ${
        threshold * 100
      }% of the budget $${budget.toFixed(2)}. Consider enabling caches or reducing parallelism on expensive nodes.`,
      appliesTo: estimates.criticalPath,
      estimatedGain: { costUSD: Number((estimates.costUSD * 0.2).toFixed(2)) }
    });
  }

  const heavyNodes = workflow.nodes.filter(
    (node) => (node.estimates?.costUSD ?? 0) > (node.budgetUSD ?? budget)
  );
  for (const node of heavyNodes) {
    suggestions.push({
      code: "budget.node",
      title: `Reduce spend on ${node.id}`,
      detail: `Node ${node.id} is estimated at $${
        node.estimates?.costUSD?.toFixed(2) ?? "0.00"
      }, exceeding the per-node budget of $${(node.budgetUSD ?? budget).toFixed(
        2
      )}. Introduce caching or split the workload.`,
      appliesTo: [node.id]
    });
  }

  if (workflow.constraints.maxParallelism) {
    for (const node of workflow.nodes) {
      if (node.parallelism && node.parallelism > workflow.constraints.maxParallelism) {
        suggestions.push({
          code: "parallelism.reduce",
          title: `Scale down ${node.id} parallelism`,
          detail: `Parallelism ${node.parallelism} exceeds constraint ${workflow.constraints.maxParallelism}. Reduce concurrency or request an exception.`,
          appliesTo: [node.id]
        });
      }
    }
  }

  return suggestions;
}

export function buildPolicyInput(workflow: WorkflowDefinition): PolicyInput {
  return derivePolicyInput(workflow);
}

function validatePolicy(
  policy: WorkflowPolicy,
  nodes: WorkflowNode[]
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  if (policy.pii && policy.retention !== SHORT_RETENTION) {
    issues.push({
      severity: "error",
      code: "policy.retention",
      message: `PII workflows must use ${SHORT_RETENTION} retention. Current value: ${policy.retention}`
    });
  }
  const securityNodes = nodes.filter((node) => node.type.startsWith("security."));
  if (securityNodes.length > 0 && policy.licenseClass !== "SEC-APPROVED") {
    issues.push({
      severity: "warning",
      code: "policy.license",
      message: "Security nodes detected. Consider upgrading licenseClass to SEC-APPROVED for scanner entitlements.",
      nodes: securityNodes.map((node) => node.id)
    });
  }
  const deployNodes = nodes.filter((node) => node.type.startsWith("deploy."));
  if (deployNodes.length > 0 && policy.purpose !== "production") {
    issues.push({
      severity: "warning",
      code: "policy.purpose",
      message: "Deploy nodes typically require purpose=production for auditability.",
      nodes: deployNodes.map((node) => node.id)
    });
  }
  return issues;
}

function scanForLiteralSecret(params: Record<string, unknown>): SecretScanResult {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === "string") {
      if (looksSecretLike(key, value)) {
        if (!value.startsWith("vault://") && !value.startsWith("env://")) {
          return { path: key, value };
        }
      }
    } else if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const nested = value[index];
        if (typeof nested === "string" && looksSecretLike(key, nested)) {
          if (!nested.startsWith("vault://") && !nested.startsWith("env://")) {
            return { path: `${key}[${index}]`, value: nested };
          }
        }
        if (typeof nested === "object" && nested) {
          const result = scanForLiteralSecret(nested as Record<string, unknown>);
          if (result) {
            return { path: `${key}[${index}].${result.path}`, value: result.value };
          }
        }
      }
    } else if (typeof value === "object") {
      if (ensureSecret(value)) {
        continue;
      }
      const nestedResult = scanForLiteralSecret(value as Record<string, unknown>);
      if (nestedResult) {
        return { path: `${key}.${nestedResult.path}`, value: nestedResult.value };
      }
    }
  }
  return null;
}

function looksSecretLike(key: string, value: string): boolean {
  const sensitive = /(secret|token|password|api[-_]?key|credential|bearer)/i;
  return sensitive.test(key) || sensitive.test(value);
}

function buildAdjacency(edges: WorkflowEdge[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, new Set());
    }
    adjacency.get(edge.from)!.add(edge.to);
  }
  return adjacency;
}

function buildIncomingMap(edges: WorkflowEdge[]): Map<string, Set<string>> {
  const incoming = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!incoming.has(edge.to)) {
      incoming.set(edge.to, new Set());
    }
    incoming.get(edge.to)!.add(edge.from);
  }
  return incoming;
}

function discoverReachable(
  workflow: WorkflowDefinition,
  sources: string[]
): Set<string> {
  const adjacency = buildAdjacency(workflow.edges);
  const reachable = new Set<string>();
  const queue = [...sources];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || reachable.has(nodeId)) {
      continue;
    }
    reachable.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      queue.push(neighbor);
    }
  }
  return reachable;
}

function validateArtifactCompatibility(
  from: WorkflowNode,
  to: WorkflowNode
): string | null {
  if (!from.produces || !to.consumes) {
    return null;
  }
  const producedTypes = new Set(from.produces.map((artifact) => artifact.type));
  for (const artifact of to.consumes) {
    if (!artifact.optional && !producedTypes.has(artifact.type)) {
      return `Node ${to.id} expects artifact type ${artifact.type} from ${from.id}, but producer emits ${[...
        producedTypes
      ].join(", ") || "none"}.`;
    }
  }
  return null;
}

export function collectArtifactCatalog(
  workflow: WorkflowDefinition
): ArtifactBinding[] {
  return enumerateArtifacts(workflow.nodes);
}

export { analyzeEvidence } from "common-types";
