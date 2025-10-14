import { createHash, createHmac } from "node:crypto";
import { performance } from "node:perf_hooks";
import {
  MODEL_ALLOWLIST,
  PURPOSE_ALLOWLIST,
  SHORT_RETENTION,
  analyzeEvidence,
  derivePolicyInput,
  ensureSecret,
  enumerateArtifacts,
  listSinkNodes,
  listSourceNodes,
  mergeDataClasses,
  normalizeWorkflow
} from "common-types";
import type {
  ArtifactBinding,
  CursorDataClass,
  CursorEvent,
  CursorPurpose,
  PolicyCondition,
  PolicyDecision,
  PolicyEvaluationContext,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyEvaluationTrace,
  PolicyEffect,
  PolicyInput,
  PolicyObligation,
  PolicyRule,
  ValidationDefaults,
  WhatIfScenario,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowEstimates,
  WorkflowNode,
  WorkflowPolicy,
  WorkflowStaticAnalysis,
  WorkflowSuggestion,
  WorkflowValidationIssue,
  WorkflowValidationResult
} from "common-types";

// ============================================================================
// RUNTIME POLICY ENGINE - From HEAD
// ============================================================================

function valueMatches(
  left: string | number | boolean | undefined,
  operator: PolicyCondition['operator'],
  right: PolicyCondition['value']
): boolean {
  if (left === undefined) {
    return false;
  }

  switch (operator) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'lt':
      return typeof left === 'number' && typeof right === 'number' && left < right;
    case 'lte':
      return typeof left === 'number' && typeof right === 'number' && left <= right;
    case 'gt':
      return typeof left === 'number' && typeof right === 'number' && left > right;
    case 'gte':
      return typeof left === 'number' && typeof right === 'number' && left >= right;
    case 'includes':
      if (Array.isArray(right)) {
        if (Array.isArray(left)) {
          return left.some(item => right.includes(item));
        }
        return right.includes(left);
      }
      if (Array.isArray(left)) {
        return left.includes(right as never);
      }
      return false;
    default:
      return false;
  }
}

function ruleTargetsRequest(rule: PolicyRule, request: PolicyEvaluationRequest): boolean {
  const actionMatch =
    rule.actions.length === 0 || rule.actions.some(action => action === request.action);
  const resourceMatch =
    rule.resources.length === 0 || rule.resources.some(resource => resource === request.resource);
  return actionMatch && resourceMatch;
}

function evaluateConditions(
  rule: PolicyRule,
  request: PolicyEvaluationRequest,
  trace: string[]
): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return true;
  }

  const attributes = {
    roles: request.context.roles,
    region: request.context.region,
    ...request.context.attributes
  } as Record<string, string | number | boolean | Array<string | number | boolean>>;

  return rule.conditions.every(condition => {
    const candidate = attributes[condition.attribute];
    const matched = valueMatches(candidate as never, condition.operator, condition.value);
    if (!matched) {
      trace.push(
        `condition ${condition.attribute} ${condition.operator} ${JSON.stringify(condition.value)} failed`
      );
    }
    return matched;
  });
}

export class PolicyEngine {
  private readonly rules: PolicyRule[];

  constructor(rules: PolicyRule[] = []) {
    this.rules = [...rules];
  }

  registerRule(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  evaluate(request: PolicyEvaluationRequest): PolicyEvaluationResult {
    const matchedRules: string[] = [];
    const reasons: string[] = [];
    const obligations = [] as NonNullable<PolicyRule['obligations']>;
    const trace: PolicyEvaluationTrace[] = [];

    let finalEffect: PolicyEffect = 'deny';

    for (const rule of this.rules) {
      const ruleReasons: string[] = [];
      let matched = false;

      if (ruleTargetsRequest(rule, request)) {
        matched = evaluateConditions(rule, request, ruleReasons);
      }

      if (matched) {
        matchedRules.push(rule.id);
        if (rule.effect === 'deny') {
          finalEffect = 'deny';
          reasons.push(`Denied by ${rule.id}`);
          trace.push({ ruleId: rule.id, matched: true, reasons: ruleReasons });
          return {
            allowed: false,
            effect: 'deny',
            matchedRules,
            reasons,
            obligations: [],
            trace
          };
        }

        finalEffect = 'allow';
        reasons.push(`Allowed by ${rule.id}`);
        if (rule.obligations) {
          obligations.push(...rule.obligations);
        }
      } else {
        if (ruleReasons.length > 0) {
          reasons.push(...ruleReasons.map(reason => `${rule.id}: ${reason}`));
        }
      }

      trace.push({ ruleId: rule.id, matched, reasons: ruleReasons });
    }

    return {
      allowed: finalEffect === 'allow',
      effect: finalEffect,
      matchedRules,
      reasons,
      obligations,
      trace
    };
  }
}

export function buildDefaultPolicyEngine(): PolicyEngine {
  const engine = new PolicyEngine([
    {
      id: 'default-allow-intent-read',
      description: 'Allow read access to intents within the tenant',
      effect: 'allow',
      actions: ['intent:read'],
      resources: ['intent'],
      conditions: [
        { attribute: 'roles', operator: 'includes', value: ['product-manager', 'architect'] }
      ],
      obligations: [{ type: 'emit-audit' }]
    },
    {
      id: 'allow-workcell-execution',
      description: 'Permit authorised roles to execute workcell tasks in approved regions',
      effect: 'allow',
      actions: ['workcell:execute'],
      resources: ['analysis', 'codegen', 'evaluation'],
      conditions: [
        { attribute: 'roles', operator: 'includes', value: ['developer', 'architect'] },
        { attribute: 'region', operator: 'eq', value: 'allowed-region' }
      ],
      obligations: [{ type: 'record-provenance' }]
    },
    {
      id: 'deny-out-of-region-models',
      description: 'Block model usage when region requirements do not match',
      effect: 'deny',
      actions: ['model:invoke'],
      resources: ['llm'],
      conditions: [{ attribute: 'region', operator: 'neq', value: 'allowed-region' }]
    }
  ]);

  return engine;
}

// ============================================================================
// CURSOR POLICY EVALUATION - Added from PR 1299
// ============================================================================

export interface PolicyConfig {
  allowedLicenses: string[];
  allowedPurposes: CursorPurpose[];
  modelAllowList: string[];
  deniedDataClasses?: CursorDataClass[];
  redactableDataClasses?: CursorDataClass[];
  requireRedactionForDeniedDataClasses?: boolean;
  purposeOverrides?: Record<string, { allow: boolean; explanation: string }>;
  licenseOverrides?: Record<string, { allow: boolean; explanation: string }>;
  blockedModels?: Record<string, string>;
}

export interface PolicyEvaluatorOptions {
  config: PolicyConfig;
  now?: () => Date;
}

const DEFAULT_CONFIG: PolicyConfig = {
  allowedLicenses: ["MIT", "Apache-2.0"],
  allowedPurposes: [...PURPOSE_ALLOWLIST],
  modelAllowList: Array.from(MODEL_ALLOWLIST),
  deniedDataClasses: ["production-PII", "secrets", "proprietary-client"],
  redactableDataClasses: ["production-PII"],
  requireRedactionForDeniedDataClasses: true,
};

export class PolicyEvaluator {
  private readonly config: PolicyConfig;
  private readonly now: () => Date;

  constructor(options?: PolicyEvaluatorOptions) {
    this.config = options?.config ?? DEFAULT_CONFIG;
    this.now = options?.now ?? (() => new Date());
  }

  evaluate(
    event: CursorEvent,
    context: PolicyEvaluationContext = {}
  ): PolicyDecision {
    const explanations: string[] = [];
    const ruleIds: string[] = [];
    const denies: string[] = [];

    const model = context.model ?? event.model;
    if (!model) {
      denies.push("model-missing");
    } else {
      const allowReason = this.checkModel(model.name);
      explanations.push(allowReason);
      if (allowReason.startsWith("deny:")) {
        denies.push(allowReason);
      } else {
        ruleIds.push("model-allowlist");
      }
    }

    const purpose = context.purpose ?? event.purpose;
    const purposeDecision = this.checkPurpose(purpose);
    explanations.push(purposeDecision);
    if (purposeDecision.startsWith("deny:")) {
      denies.push(purposeDecision);
    } else {
      ruleIds.push("purpose-allowlist");
    }

    const license = context.repoMeta?.license;
    if (license) {
      const licenseDecision = this.checkLicense(license);
      explanations.push(licenseDecision);
      if (licenseDecision.startsWith("deny:")) {
        denies.push(licenseDecision);
      } else {
        ruleIds.push("license-allowlist");
      }
    } else {
      explanations.push("warn:license-unknown");
    }

    const scan = context.scan;
    if (scan?.piiFound) {
      denies.push("deny:pii-detected");
      explanations.push("deny:pii-detected");
    } else {
      explanations.push("allow:no-pii");
    }

    if (scan?.secretsFound) {
      denies.push("deny:secret-detected");
      explanations.push("deny:secret-detected");
    }

    const classes = mergeDataClasses(event, context);
    const dataClassDecision = this.checkDataClasses(classes, scan);
    explanations.push(...dataClassDecision.explanations);
    denies.push(...dataClassDecision.denies);
    if (dataClassDecision.ruleId) {
      ruleIds.push(dataClassDecision.ruleId);
    }

    const decision: PolicyDecision = {
      decision: denies.length > 0 ? "deny" : "allow",
      explanations,
      ruleIds,
      timestamp: this.now().toISOString(),
      metadata: {
        model: model?.name,
        purpose,
        license,
        dataClasses: classes,
        scan,
      },
    };

    if (denies.length > 0) {
      decision.metadata = {
        ...decision.metadata,
        denyReasons: denies,
      };
    }

    return decision;
  }

  private checkModel(modelName: string): string {
    if (this.config.blockedModels?.[modelName]) {
      return `deny:model-blocked:${this.config.blockedModels[modelName]}`;
    }

    if (this.config.modelAllowList.includes(modelName)) {
      return `allow:model:${modelName}`;
    }

    return "deny:model-not-allowed";
  }

  private checkPurpose(purpose: CursorPurpose): string {
    const override = this.config.purposeOverrides?.[purpose];
    if (override) {
      return `${override.allow ? "allow" : "deny"}:purpose:${override.explanation}`;
    }

    if (this.config.allowedPurposes.includes(purpose)) {
      return `allow:purpose:${purpose}`;
    }

    return "deny:purpose-not-allowed";
  }

  private checkLicense(license: string): string {
    const override = this.config.licenseOverrides?.[license];
    if (override) {
      return `${override.allow ? "allow" : "deny"}:license:${override.explanation}`;
    }

    if (this.config.allowedLicenses.includes(license)) {
      return `allow:license:${license}`;
    }

    return "deny:license-not-allowed";
  }

  private checkDataClasses(
    classes: CursorDataClass[],
    scan?: PolicyEvaluationContext["scan"]
  ): { explanations: string[]; denies: string[]; ruleId?: string } {
    const explanations: string[] = [];
    const denies: string[] = [];

    if (classes.length === 0) {
      explanations.push("allow:no-sensitive-classes");
      return { explanations, denies, ruleId: "data-class-baseline" };
    }

    const denied = new Set(this.config.deniedDataClasses ?? []);
    const redactable = new Set(this.config.redactableDataClasses ?? []);
    const flagged: CursorDataClass[] = [];
    const redactionRequired: CursorDataClass[] = [];

    for (const dataClass of classes) {
      if (denied.has(dataClass)) {
        flagged.push(dataClass);
        if (redactable.has(dataClass)) {
          redactionRequired.push(dataClass);
        }
      }
    }

    if (flagged.length === 0) {
      explanations.push("allow:data-classes-ok");
      return { explanations, denies, ruleId: "data-class-baseline" };
    }

    if (
      redactionRequired.length > 0 &&
      this.config.requireRedactionForDeniedDataClasses &&
      !scan?.redactionsApplied
    ) {
      denies.push(
        `deny:redaction-required:${redactionRequired.join(",")}`
      );
      explanations.push(
        `deny:redaction-required:${redactionRequired.join(",")}`
      );
      return { explanations, denies, ruleId: "data-class-redaction" };
    }

    if (flagged.length > 0 && redactionRequired.length === 0) {
      denies.push(`deny:data-class:${flagged.join(",")}`);
      explanations.push(`deny:data-class:${flagged.join(",")}`);
      return { explanations, denies, ruleId: "data-class-deny" };
    }

    explanations.push("allow:data-classes-redacted");
    return { explanations, denies, ruleId: "data-class-redaction" };
  }
}

// ============================================================================
// WORKFLOW VALIDATION - From codex/create-drag-and-drop-workflow-creator
// ============================================================================

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
      message: `Estimated cost ${estimated.costUSD.toFixed(2)} exceeds budget ${normalized.constraints.budgetUSD.toFixed(2)}`,
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
      detail: `Estimated cost ${estimates.costUSD.toFixed(2)} is at or above ${
        threshold * 100
      }% of the budget ${budget.toFixed(2)}. Consider enabling caches or reducing parallelism on expensive nodes.`,
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
      detail: `Node ${node.id} is estimated at ${
        node.estimates?.costUSD?.toFixed(2) ?? "0.00"
      }, exceeding the per-node budget of ${(node.budgetUSD ?? budget).toFixed(
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

function clonePolicyRules(rules: PolicyRule[]): PolicyRule[] {
  return rules.map(rule => ({
    ...rule,
    actions: [...rule.actions],
    resources: [...rule.resources],
    conditions: rule.conditions
      ? rule.conditions.map(condition => ({
          ...condition,
          value: Array.isArray(condition.value)
            ? [...condition.value]
            : condition.value
        }))
      : undefined,
    obligations: rule.obligations
      ? rule.obligations.map(obligation => ({
          ...obligation,
          configuration: obligation.configuration
            ? { ...obligation.configuration }
            : undefined
        }))
      : undefined,
    tags: rule.tags ? [...rule.tags] : undefined
  }));
}

const DEFAULT_ACTIONS = [
  "intent:read",
  "intent:write",
  "model:invoke",
  "dataset:read",
  "dataset:write",
  "audit:emit",
  "data:sell",
  "profile:share",
  "workcell:execute",
  "data:export"
];

const DEFAULT_RESOURCES = [
  "intent",
  "dataset",
  "analytics",
  "model",
  "llm",
  "personal-data",
  "pii-records",
  "audit-log",
  "training-data"
];

const DEFAULT_REGIONS = [
  "eu-west-1",
  "eu-central-1",
  "us-east-1",
  "us-west-2",
  "ap-south-1",
  "restricted-region"
];

const DEFAULT_TENANTS = ["tenant-alpha", "tenant-beta", "tenant-gamma", "tenant-delta"];

const DEFAULT_ROLE_SETS: ReadonlyArray<readonly string[]> = [
  ["developer"],
  ["analyst"],
  ["admin"],
  ["auditor"],
  ["developer", "security"],
  ["support", "compliance"],
  ["product-manager"],
  ["architect"]
];

const SENSITIVITY_LEVELS = ["public", "internal", "confidential", "restricted"] as const;

const GDPR_SENSITIVE_RESOURCE_HINTS = [
  /pii/i,
  /personal/i,
  /subject/i,
  /customer/i
];

const GDPR_MINIMIZATION_OBLIGATIONS = [
  "data-minimization",
  "pii-redaction",
  "mask-personal-data",
  "encrypt-at-rest"
];

const GDPR_RETENTION_OBLIGATIONS = [
  "retention-check",
  "delete-after-use",
  "right-to-erasure"
];

const CCPA_CONSENT_OBLIGATIONS = [
  "consent-check",
  "do-not-sell-flag",
  "notice-of-collection"
];

const SOC2_AUDIT_OBLIGATIONS = ["audit-log", "emit-audit", "record-provenance"];

interface LcgState {
  state: number;
}

function nextRandom(state: LcgState): number {
  state.state = (1664525 * state.state + 1013904223) >>> 0;
  return state.state / 0x100000000;
}

function pick<T>(values: readonly T[], rng: () => number): T {
  if (values.length === 0) {
    throw new Error("Cannot pick from an empty set of values");
  }
  const index = Math.floor(rng() * values.length);
  return values[index];
}

function serializeObligations(obligations: PolicyObligation[]): string {
  const normalized = obligations
    .map(obligation => ({
      ...obligation,
      configuration: obligation.configuration
        ? Object.keys(obligation.configuration)
            .sort()
            .reduce<Record<string, unknown>>((acc, key) => {
              acc[key] = obligation.configuration![key];
              return acc;
            }, {})
        : undefined
    }))
    .sort((left, right) => left.type.localeCompare(right.type));
  return JSON.stringify(normalized);
}

export interface SyntheticEventGeneratorOptions {
  readonly seed?: number;
  readonly actions?: readonly string[];
  readonly resources?: readonly string[];
  readonly regions?: readonly string[];
  readonly tenants?: readonly string[];
  readonly roleSets?: ReadonlyArray<readonly string[]>;
}

export interface SyntheticEventBatchOptions {
  readonly includeEdgeCases?: boolean;
  readonly edgeCaseProbability?: number;
}

export interface SyntheticEventBatchMetrics {
  readonly durationMs: number;
  readonly eventsPerSecond: number;
  readonly edgeCasesEmitted: number;
}

export interface SyntheticEventBatch {
  readonly events: PolicyEvaluationRequest[];
  readonly metrics: SyntheticEventBatchMetrics;
}

export class SyntheticEventGenerator {
  private readonly rngState: LcgState;

  private readonly actions: readonly string[];

  private readonly resources: readonly string[];

  private readonly regions: readonly string[];

  private readonly tenants: readonly string[];

  private readonly roleSets: ReadonlyArray<readonly string[]>;

  private readonly baseEdgeProbability = 0.05;

  private readonly edgeVariants = 5;

  constructor(options: SyntheticEventGeneratorOptions = {}) {
    const seed = options.seed ?? Date.now();
    this.rngState = { state: seed >>> 0 };
    this.actions = options.actions ?? DEFAULT_ACTIONS;
    this.resources = options.resources ?? DEFAULT_RESOURCES;
    this.regions = options.regions ?? DEFAULT_REGIONS;
    this.tenants = options.tenants ?? DEFAULT_TENANTS;
    this.roleSets = options.roleSets ?? DEFAULT_ROLE_SETS;
  }

  generateBatch(count: number, options: SyntheticEventBatchOptions = {}): SyntheticEventBatch {
    if (count <= 0) {
      return {
        events: [],
        metrics: { durationMs: 0, eventsPerSecond: 0, edgeCasesEmitted: 0 }
      };
    }
    const includeEdgeCases = options.includeEdgeCases ?? true;
    const edgeProbability = options.edgeCaseProbability ?? this.baseEdgeProbability;
    let edgeCasesEmitted = 0;
    const start = performance.now();
    const events: PolicyEvaluationRequest[] = [];
    for (let index = 0; index < count; index += 1) {
      let event = this.buildBaseEvent();
      if (includeEdgeCases) {
        if (index < this.edgeVariants) {
          event = this.applyEdgeCase(event, index);
          edgeCasesEmitted += 1;
        } else if (this.random() < edgeProbability) {
          event = this.applyEdgeCase(event, Math.floor(this.random() * this.edgeVariants));
          edgeCasesEmitted += 1;
        }
      }
      events.push(event);
    }
    const durationMs = performance.now() - start;
    const eventsPerSecond = count / Math.max(durationMs / 1000, 1e-6);
    return {
      events,
      metrics: { durationMs, eventsPerSecond, edgeCasesEmitted }
    };
  }

  generateEvents(count: number, options: SyntheticEventBatchOptions = {}): PolicyEvaluationRequest[] {
    return this.generateBatch(count, options).events;
  }

  private random(): number {
    return nextRandom(this.rngState);
  }

  private buildBaseEvent(): PolicyEvaluationRequest {
    const rng = () => this.random();
    const action = pick(this.actions, rng);
    const resource = pick(this.resources, rng);
    const tenant = pick(this.tenants, rng);
    const region = pick(this.regions, rng);
    const roles = new Set(pick(this.roleSets, rng));
    if (this.random() < 0.2) {
      roles.add("observer");
    }
    const riskScore = Math.round(this.random() * 100);
    const attributes: Record<string, string | number | boolean> = {
      sensitivity: pick(SENSITIVITY_LEVELS, rng),
      riskScore,
      consentProvided: this.random() > 0.15,
      retentionDays: Math.floor(this.random() * 365),
      requestId: `req-${tenant}-${Math.floor(this.random() * 1_000_000).toString(16)}`
    };
    if (/pii|personal/.test(resource)) {
      attributes.containsPii = true;
    }
    if (action === "model:invoke") {
      attributes.model = `model-${Math.floor(this.random() * 20)}`;
      attributes.modelTier = this.random() > 0.5 ? "standard" : "premium";
    }
    if (this.random() < 0.1) {
      attributes.abTestGroup = this.random() > 0.5 ? "treatment" : "control";
    }
    return {
      action,
      resource,
      context: {
        tenantId: tenant,
        userId: `user-${Math.floor(this.random() * 100_000)}`,
        roles: [...roles],
        region,
        attributes
      }
    };
  }

  private applyEdgeCase(
    event: PolicyEvaluationRequest,
    variant: number
  ): PolicyEvaluationRequest {
    const normalizedVariant = variant % this.edgeVariants;
    switch (normalizedVariant) {
      case 0:
        return {
          ...event,
          context: { ...event.context, roles: [] }
        };
      case 1: {
        const { region: _ignored, ...rest } = event.context;
        return {
          ...event,
          context: { ...rest }
        };
      }
      case 2:
        return {
          ...event,
          action: "data:sell",
          context: {
            ...event.context,
            attributes: {
              ...event.context.attributes,
              consentProvided: false,
              saleChannel: "third-party"
            }
          }
        };
      case 3:
        return {
          ...event,
          resource: "pii-records",
          context: {
            ...event.context,
            region: "restricted-region",
            attributes: {
              ...event.context.attributes,
              sensitivity: "restricted",
              containsPii: true,
              residency: "eu"
            }
          }
        };
      default:
        return {
          ...event,
          context: {
            ...event.context,
            attributes: {
              ...event.context.attributes,
              retentionDays: 10_000,
              justification: "long-term-analytics"
            }
          }
        };
    }
  }
}

export interface PolicyDiffEvent {
  readonly request: PolicyEvaluationRequest;
  readonly before: PolicyEvaluationResult;
  readonly after: PolicyEvaluationResult;
  readonly decisionChanged: boolean;
  readonly obligationsChanged: boolean;
}

export interface PolicyDiffSummary {
  readonly total: number;
  readonly decisionChanges: number;
  readonly obligationsChanges: number;
  readonly improved: number;
  readonly regressed: number;
  readonly unchanged: number;
  readonly details: PolicyDiffEvent[];
}

interface PolicyDiffEngineInput {
  readonly events: PolicyEvaluationRequest[];
  readonly before: PolicyEvaluationResult[];
  readonly after: PolicyEvaluationResult[];
}

export class PolicyDiffEngine {
  static compare(input: PolicyDiffEngineInput): PolicyDiffSummary {
    const { events, before, after } = input;
    if (events.length !== before.length || events.length !== after.length) {
      throw new Error("Diff inputs must have matching lengths");
    }
    let decisionChanges = 0;
    let obligationsChanges = 0;
    let improved = 0;
    let regressed = 0;
    const details: PolicyDiffEvent[] = [];
    for (let index = 0; index < events.length; index += 1) {
      const beforeResult = before[index];
      const afterResult = after[index];
      const decisionChanged = beforeResult.effect !== afterResult.effect;
      const obligationsChanged =
        serializeObligations(beforeResult.obligations ?? []) !==
        serializeObligations(afterResult.obligations ?? []);
      if (decisionChanged) {
        decisionChanges += 1;
        if (!beforeResult.allowed && afterResult.allowed) {
          improved += 1;
        } else if (beforeResult.allowed && !afterResult.allowed) {
          regressed += 1;
        }
      }
      if (obligationsChanged) {
        obligationsChanges += 1;
      }
      details.push({
        request: events[index],
        before: beforeResult,
        after: afterResult,
        decisionChanged,
        obligationsChanged
      });
    }
    return {
      total: events.length,
      decisionChanges,
      obligationsChanges,
      improved,
      regressed,
      unchanged: events.length - decisionChanges,
      details
    };
  }

  static diffPolicies(
    beforePolicies: PolicyRule[],
    afterPolicies: PolicyRule[],
    events: PolicyEvaluationRequest[]
  ): PolicyDiffSummary {
    const baselineEngine = new PolicyEngine(clonePolicyRules(beforePolicies));
    const candidateEngine = new PolicyEngine(clonePolicyRules(afterPolicies));
    const before = events.map(event => baselineEngine.evaluate(event));
    const after = events.map(event => candidateEngine.evaluate(event));
    return this.compare({ events, before, after });
  }
}

export type ComplianceFramework = "GDPR" | "CCPA" | "SOC2";

export interface ComplianceIssue {
  readonly framework: ComplianceFramework;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly ruleId?: string;
}

export interface ComplianceReport {
  readonly compliant: boolean;
  readonly issues: ComplianceIssue[];
  readonly frameworkSummaries: Record<ComplianceFramework, { issues: ComplianceIssue[]; compliant: boolean }>;
}

export interface ComplianceCheckerOptions {
  readonly sensitiveResourceHints?: readonly RegExp[];
  readonly minimizationObligations?: readonly string[];
  readonly retentionObligations?: readonly string[];
  readonly consentObligations?: readonly string[];
  readonly auditObligations?: readonly string[];
}

export class ComplianceChecker {
  private readonly policies: PolicyRule[];

  private readonly sensitiveResourceHints: readonly RegExp[];

  private readonly minimizationObligations: readonly string[];

  private readonly retentionObligations: readonly string[];

  private readonly consentObligations: readonly string[];

  private readonly auditObligations: readonly string[];

  constructor(policies: PolicyRule[], options: ComplianceCheckerOptions = {}) {
    this.policies = clonePolicyRules(policies);
    this.sensitiveResourceHints = options.sensitiveResourceHints ?? GDPR_SENSITIVE_RESOURCE_HINTS;
    this.minimizationObligations = options.minimizationObligations ?? GDPR_MINIMIZATION_OBLIGATIONS;
    this.retentionObligations = options.retentionObligations ?? GDPR_RETENTION_OBLIGATIONS;
    this.consentObligations = options.consentObligations ?? CCPA_CONSENT_OBLIGATIONS;
    this.auditObligations = options.auditObligations ?? SOC2_AUDIT_OBLIGATIONS;
  }

  checkAll(): ComplianceReport {
    const frameworks: ComplianceFramework[] = ["GDPR", "CCPA", "SOC2"];
    const frameworkSummaries: Record<ComplianceFramework, { issues: ComplianceIssue[]; compliant: boolean }> = {
      GDPR: { issues: this.checkFramework("GDPR"), compliant: false },
      CCPA: { issues: [], compliant: false },
      SOC2: { issues: [], compliant: false }
    } as Record<ComplianceFramework, { issues: ComplianceIssue[]; compliant: boolean }>;
    frameworkSummaries.CCPA = { issues: this.checkFramework("CCPA"), compliant: false };
    frameworkSummaries.SOC2 = { issues: this.checkFramework("SOC2"), compliant: false };
    for (const framework of frameworks) {
      frameworkSummaries[framework].compliant = frameworkSummaries[framework].issues.every(
        issue => issue.severity !== "error"
      );
    }
    const issues = frameworks.flatMap(framework => frameworkSummaries[framework].issues);
    const compliant = issues.every(issue => issue.severity !== "error");
    return { compliant, issues, frameworkSummaries };
  }

  checkFramework(framework: ComplianceFramework): ComplianceIssue[] {
    switch (framework) {
      case "GDPR":
        return this.checkGdpr();
      case "CCPA":
        return this.checkCcpa();
      case "SOC2":
        return this.checkSoc2();
      default:
        return [];
    }
  }

  private checkGdpr(): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    let exportGuardPresent = false;
    let retentionGuardPresent = false;
    for (const rule of this.policies) {
      const isAllowRule = rule.effect === "allow";
      const resourceMatches = rule.resources.some(resource =>
        this.sensitiveResourceHints.some(hint => hint.test(resource))
      );
      if (isAllowRule && resourceMatches) {
        const hasRegionCondition = Boolean(
          rule.conditions?.some(condition => condition.attribute === "region")
        );
        const hasMinimization = Boolean(
          rule.obligations?.some(obligation =>
            this.minimizationObligations.includes(obligation.type)
          )
        );
        if (!hasRegionCondition) {
          issues.push({
            framework: "GDPR",
            severity: "error",
            message: `Rule ${rule.id} allows sensitive data without a region restriction`,
            ruleId: rule.id
          });
        }
        if (!hasMinimization) {
          issues.push({
            framework: "GDPR",
            severity: "warning",
            message: `Rule ${rule.id} should declare a data minimization obligation`,
            ruleId: rule.id
          });
        }
      }
      if (
        rule.effect === "deny" &&
        (rule.actions.includes("data:export") || rule.actions.includes("data:sell"))
      ) {
        exportGuardPresent = true;
      }
      if (
        rule.obligations?.some(obligation =>
          this.retentionObligations.includes(obligation.type)
        )
      ) {
        retentionGuardPresent = true;
      }
    }
    if (!exportGuardPresent) {
      issues.push({
        framework: "GDPR",
        severity: "error",
        message: "Policies must deny data export or sale without explicit review"
      });
    }
    if (!retentionGuardPresent) {
      issues.push({
        framework: "GDPR",
        severity: "warning",
        message: "Add retention or erasure obligations to demonstrate compliance"
      });
    }
    return issues;
  }

  private checkCcpa(): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    let hasOptOutDeny = false;
    for (const rule of this.policies) {
      const targetsSale = rule.actions.some(action =>
        action.includes("data:sell") || action.includes("profile:share")
      );
      if (!targetsSale) {
        continue;
      }
      if (rule.effect === "deny") {
        hasOptOutDeny = true;
        continue;
      }
      const hasConsentObligation = Boolean(
        rule.obligations?.some(obligation =>
          this.consentObligations.includes(obligation.type)
        )
      );
      if (!hasConsentObligation) {
        issues.push({
          framework: "CCPA",
          severity: "error",
          message: `Rule ${rule.id} allows sale or sharing without a consent obligation`,
          ruleId: rule.id
        });
      }
    }
    if (!hasOptOutDeny) {
      issues.push({
        framework: "CCPA",
        severity: "warning",
        message: "Add an explicit deny rule for users who opt out of data sales"
      });
    }
    return issues;
  }

  private checkSoc2(): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    const auditSet = new Set(this.auditObligations);
    let hasAuditObligation = false;
    let hasDefaultDeny = false;
    for (const rule of this.policies) {
      if (rule.obligations?.some(obligation => auditSet.has(obligation.type))) {
        hasAuditObligation = true;
      }
      if (rule.effect === "deny" && rule.actions.length === 0 && rule.resources.length === 0) {
        hasDefaultDeny = true;
      }
    }
    if (!hasAuditObligation) {
      issues.push({
        framework: "SOC2",
        severity: "error",
        message: "Policies must emit audit logs for SOC2 traceability"
      });
    }
    if (!hasDefaultDeny) {
      issues.push({
        framework: "SOC2",
        severity: "warning",
        message: "Add a default deny rule to enforce least privilege"
      });
    }
    return issues;
  }
}

export interface PerformanceBenchmarkOptions {
  readonly iterations?: number;
  readonly warmupIterations?: number;
}

export interface PerformanceMetrics {
  readonly eventsEvaluated: number;
  readonly durationMs: number;
  readonly eventsPerSecond: number;
  readonly p95LatencyMs: number;
  readonly decisionCounts: { allow: number; deny: number };
}

export class PolicyPerformanceAnalyzer {
  static benchmark(
    policies: PolicyRule[],
    events: PolicyEvaluationRequest[],
    options: PerformanceBenchmarkOptions = {}
  ): PerformanceMetrics {
    const iterations = options.iterations ?? 1;
    const warmupIterations = options.warmupIterations ?? 0;
    const warmupEngine = new PolicyEngine(clonePolicyRules(policies));
    for (let iteration = 0; iteration < warmupIterations; iteration += 1) {
      for (const event of events) {
        warmupEngine.evaluate(event);
      }
    }
    const engine = new PolicyEngine(clonePolicyRules(policies));
    const latencies: number[] = [];
    let allow = 0;
    let deny = 0;
    const start = performance.now();
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      for (const event of events) {
        const iterationStart = performance.now();
        const result = engine.evaluate(event);
        const iterationEnd = performance.now();
        latencies.push(iterationEnd - iterationStart);
        if (result.allowed) {
          allow += 1;
        } else {
          deny += 1;
        }
      }
    }
    const durationMs = performance.now() - start;
    const eventsEvaluated = events.length * iterations;
    const eventsPerSecond = eventsEvaluated / Math.max(durationMs / 1000, 1e-6);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Index = Math.min(sortedLatencies.length - 1, Math.floor(sortedLatencies.length * 0.95));
    const p95LatencyMs = sortedLatencies[p95Index] ?? 0;
    return {
      eventsEvaluated,
      durationMs,
      eventsPerSecond,
      p95LatencyMs,
      decisionCounts: { allow, deny }
    };
  }
}

export interface PolicySandboxOptions {
  readonly name?: string;
  readonly generator?: SyntheticEventGenerator;
  readonly generatorOptions?: SyntheticEventGeneratorOptions;
}

export interface SandboxScenarioOptions {
  readonly name?: string;
  readonly events?: PolicyEvaluationRequest[];
  readonly eventCount?: number;
  readonly proposedPolicies?: PolicyRule[];
  readonly includeCompliance?: boolean;
  readonly includeBenchmark?: boolean;
  readonly benchmarkIterations?: number;
  readonly benchmarkWarmupIterations?: number;
  readonly includeEdgeCases?: boolean;
  readonly edgeCaseProbability?: number;
}

export interface PolicyEvaluationSummary {
  readonly allow: number;
  readonly deny: number;
}

export interface SandboxScenarioResult {
  readonly name: string;
  readonly events: PolicyEvaluationRequest[];
  readonly generation: SyntheticEventBatchMetrics;
  readonly baseline: PolicyEvaluationSummary;
  readonly proposed?: PolicyEvaluationSummary;
  readonly diff?: PolicyDiffSummary;
  readonly compliance?: ComplianceReport;
  readonly performance?: PerformanceMetrics;
  readonly timestamp: Date;
}

export class PolicySandbox {
  private readonly baselinePolicies: PolicyRule[];

  private readonly generator: SyntheticEventGenerator;

  readonly name?: string;

  constructor(policies: PolicyRule[], options: PolicySandboxOptions = {}) {
    this.baselinePolicies = clonePolicyRules(policies);
    this.generator = options.generator ?? new SyntheticEventGenerator(options.generatorOptions);
    this.name = options.name;
  }

  getPolicies(): PolicyRule[] {
    return clonePolicyRules(this.baselinePolicies);
  }

  getGenerator(): SyntheticEventGenerator {
    return this.generator;
  }

  evaluate(request: PolicyEvaluationRequest): PolicyEvaluationResult;
  evaluate(requests: PolicyEvaluationRequest[]): PolicyEvaluationResult[];
  evaluate(
    requestOrRequests: PolicyEvaluationRequest | PolicyEvaluationRequest[]
  ): PolicyEvaluationResult | PolicyEvaluationResult[] {
    const engine = new PolicyEngine(clonePolicyRules(this.baselinePolicies));
    if (Array.isArray(requestOrRequests)) {
      return requestOrRequests.map(request => engine.evaluate(request));
    }
    return engine.evaluate(requestOrRequests);
  }

  simulateChange(
    proposedPolicies: PolicyRule[],
    events: PolicyEvaluationRequest[]
  ): PolicyDiffSummary {
    return PolicyDiffEngine.diffPolicies(this.baselinePolicies, proposedPolicies, events);
  }

  runScenario(options: SandboxScenarioOptions = {}): SandboxScenarioResult {
    const name = options.name ?? `scenario-${Date.now()}`;
    let generation: SyntheticEventBatchMetrics = {
      durationMs: 0,
      eventsPerSecond: 0,
      edgeCasesEmitted: 0
    };
    let events = options.events ?? [];
    if (events.length === 0) {
      const batch = this.generator.generateBatch(options.eventCount ?? 500, {
        includeEdgeCases: options.includeEdgeCases,
        edgeCaseProbability: options.edgeCaseProbability
      });
      events = batch.events;
      generation = batch.metrics;
    }
    const baselineEngine = new PolicyEngine(clonePolicyRules(this.baselinePolicies));
    const baselineResults = events.map(event => baselineEngine.evaluate(event));
    const baselineSummary = summarizeEvaluations(baselineResults);
    let diff: PolicyDiffSummary | undefined;
    let proposedSummary: PolicyEvaluationSummary | undefined;
    let compliance: ComplianceReport | undefined;
    let performance: PerformanceMetrics | undefined;
    if (options.proposedPolicies) {
      const candidateEngine = new PolicyEngine(clonePolicyRules(options.proposedPolicies));
      const candidateResults = events.map(event => candidateEngine.evaluate(event));
      proposedSummary = summarizeEvaluations(candidateResults);
      diff = PolicyDiffEngine.compare({ events, before: baselineResults, after: candidateResults });
      if (options.includeCompliance) {
        compliance = new ComplianceChecker(options.proposedPolicies).checkAll();
      }
      if (options.includeBenchmark) {
        performance = PolicyPerformanceAnalyzer.benchmark(options.proposedPolicies, events, {
          iterations: options.benchmarkIterations,
          warmupIterations: options.benchmarkWarmupIterations
        });
      }
    } else {
      if (options.includeCompliance) {
        compliance = new ComplianceChecker(this.baselinePolicies).checkAll();
      }
      if (options.includeBenchmark) {
        performance = PolicyPerformanceAnalyzer.benchmark(this.baselinePolicies, events, {
          iterations: options.benchmarkIterations,
          warmupIterations: options.benchmarkWarmupIterations
        });
      }
    }
    return {
      name,
      events,
      generation,
      baseline: baselineSummary,
      proposed: proposedSummary,
      diff,
      compliance,
      performance,
      timestamp: new Date()
    };
  }
}

function summarizeEvaluations(results: PolicyEvaluationResult[]): PolicyEvaluationSummary {
  let allow = 0;
  let deny = 0;
  for (const result of results) {
    if (result.allowed) {
      allow += 1;
    } else {
      deny += 1;
    }
  }
  return { allow, deny };
}

export interface BenchmarkScenarioOptions extends SandboxScenarioOptions {
  readonly name: string;
}

export class PolicyBenchmarkSuite {
  private readonly sandbox: PolicySandbox;

  constructor(
    sandboxOrPolicies: PolicySandbox | PolicyRule[],
    options?: PolicySandboxOptions
  ) {
    this.sandbox = sandboxOrPolicies instanceof PolicySandbox
      ? sandboxOrPolicies
      : new PolicySandbox(sandboxOrPolicies, options);
  }

  runScenario(options: BenchmarkScenarioOptions): SandboxScenarioResult {
    return this.sandbox.runScenario(options);
  }

  runScenarios(scenarios: BenchmarkScenarioOptions[]): SandboxScenarioResult[] {
    return scenarios.map(scenario => this.runScenario(scenario));
  }

  getSandbox(): PolicySandbox {
    return this.sandbox;
  }
}

export { analyzeEvidence } from "common-types";
