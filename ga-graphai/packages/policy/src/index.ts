import { createHash, createHmac } from "node:crypto";
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
  normalizeWorkflow
} from "common-types";
import type {
  PolicyCondition,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyEvaluationTrace,
  PolicyEffect,
  PolicyRule,
  CursorDataClass,
  CursorEvent,
  CursorPurpose,
  PolicyDecision,
  PolicyEvaluationContext,
  mergeDataClasses,
  ArtifactBinding,
  PolicyInput,
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

// ============================================================================
// POLICY BACKTESTING ENGINE
// ============================================================================

type PolicySnapshotInputDate = Date | string;

export interface PolicySnapshot {
  policyId: string;
  version: string;
  capturedAt: PolicySnapshotInputDate;
  rules: PolicyRule[];
  metadata?: Record<string, unknown>;
}

export interface PolicyHistory {
  policyId: string;
  snapshots: PolicySnapshot[];
}

export interface HistoricalPolicyEvent {
  id?: string;
  occurredAt: Date | string;
  request: PolicyEvaluationRequest;
  expectedEffect?: PolicyEffect;
  expectedAllowed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TemporalQueryOptions {
  from?: Date | string;
  to?: Date | string;
}

export interface ComplianceResult {
  event: HistoricalPolicyEvent;
  snapshot: PolicySnapshot;
  decision: PolicyEvaluationResult;
  compliant: boolean;
  expectedEffect?: PolicyEffect;
}

export interface ImpactAnalysisReport {
  policyId: string;
  totalEvaluations: number;
  effectCounts: Record<PolicyEffect, number>;
  versionBreakdown: Record<
    string,
    {
      evaluated: number;
      allows: number;
      denies: number;
    }
  >;
  ruleHits: Record<string, number>;
  obligationCounts: Record<string, number>;
}

export interface PolicyVersionDiff {
  policyId: string;
  fromVersion: string;
  toVersion: string;
  addedRules: PolicyRule[];
  removedRules: PolicyRule[];
  changedRules: Array<{ ruleId: string; from: PolicyRule; to: PolicyRule }>;
}

export interface RetroactiveComplianceReport {
  policyId: string;
  evaluatedEvents: number;
  compliantEvents: ComplianceResult[];
  nonCompliantEvents: ComplianceResult[];
  skippedEvents: HistoricalPolicyEvent[];
  impact: ImpactAnalysisReport;
}

export interface RollbackDivergence {
  event: HistoricalPolicyEvent;
  baselineSnapshot: PolicySnapshot;
  rollbackSnapshot: PolicySnapshot;
  baselineDecision: PolicyEvaluationResult;
  rollbackDecision: PolicyEvaluationResult;
}

export interface RollbackSimulationReport {
  policyId: string;
  targetVersion: string;
  baselineVersions: string[];
  evaluatedEvents: number;
  skippedEvents: HistoricalPolicyEvent[];
  divergingEvents: RollbackDivergence[];
  impact: ImpactAnalysisReport;
}

export interface AuditRecord {
  policyId: string;
  eventId: string;
  occurredAt: Date;
  evaluatedAt: Date;
  policyVersion: string;
  effect: PolicyEffect;
  allowed: boolean;
  matchedRules: string[];
  reasons: string[];
  simulationType: "retroactive" | "rollback";
  compliant?: boolean;
  expectedEffect?: PolicyEffect;
  metadata?: Record<string, unknown>;
}

export interface AuditTrailQuery {
  policyId?: string;
  simulationType?: AuditRecord["simulationType"];
  from?: Date | string;
  to?: Date | string;
}

export type MissingSnapshotStrategy = "error" | "skip";

export interface PolicyBacktestEngineOptions {
  missingSnapshotStrategy?: MissingSnapshotStrategy;
}

interface EvaluationEntry {
  snapshot: PolicySnapshot;
  decision: PolicyEvaluationResult;
}

function normalizeDate(input: Date | string | undefined): Date | undefined {
  if (!input) {
    return undefined;
  }
  return input instanceof Date ? input : new Date(input);
}

function cloneSnapshot(snapshot: PolicySnapshot): PolicySnapshot {
  return {
    ...snapshot,
    capturedAt: new Date(snapshot.capturedAt),
    rules: snapshot.rules.map((rule) => ({ ...rule }))
  };
}

function resolveExpectedEffect(event: HistoricalPolicyEvent): PolicyEffect | undefined {
  if (event.expectedEffect) {
    return event.expectedEffect;
  }
  if (event.expectedAllowed === undefined) {
    return undefined;
  }
  return event.expectedAllowed ? "allow" : "deny";
}

export class PolicyBacktestEngine {
  private readonly history: Map<string, PolicySnapshot[]> = new Map();
  private readonly auditTrail: AuditRecord[] = [];
  private readonly missingSnapshotStrategy: MissingSnapshotStrategy;

  constructor(history: PolicyHistory[], options: PolicyBacktestEngineOptions = {}) {
    this.missingSnapshotStrategy = options.missingSnapshotStrategy ?? "error";
    history.forEach((item) => {
      const snapshots = item.snapshots
        .map((snapshot) => ({
          ...snapshot,
          capturedAt: new Date(snapshot.capturedAt)
        }))
        .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
      this.history.set(item.policyId, snapshots);
    });
  }

  registerSnapshot(policyId: string, snapshot: PolicySnapshot): void {
    const normalized = {
      ...snapshot,
      capturedAt: new Date(snapshot.capturedAt)
    };
    const existing = this.history.get(policyId) ?? [];
    existing.push(normalized);
    existing.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    this.history.set(policyId, existing);
  }

  listPolicies(): string[] {
    return Array.from(this.history.keys());
  }

  getSnapshots(policyId: string): PolicySnapshot[] {
    const snapshots = this.history.get(policyId) ?? [];
    return snapshots.map((snapshot) => cloneSnapshot(snapshot));
  }

  querySnapshots(policyId: string, options: TemporalQueryOptions = {}): PolicySnapshot[] {
    const from = normalizeDate(options.from)?.getTime();
    const to = normalizeDate(options.to)?.getTime();
    return this.getSnapshots(policyId).filter((snapshot) => {
      const ts = snapshot.capturedAt.getTime();
      if (from !== undefined && ts < from) {
        return false;
      }
      if (to !== undefined && ts > to) {
        return false;
      }
      return true;
    });
  }

  getSnapshotAt(policyId: string, timestamp: Date | string): PolicySnapshot | undefined {
    const snapshots = this.history.get(policyId);
    if (!snapshots || snapshots.length === 0) {
      return undefined;
    }
    const target = normalizeDate(timestamp)?.getTime();
    if (target === undefined) {
      return undefined;
    }
    let candidate: PolicySnapshot | undefined;
    for (const snapshot of snapshots) {
      if (snapshot.capturedAt.getTime() <= target) {
        candidate = snapshot;
      } else {
        break;
      }
    }
    return candidate ? cloneSnapshot(candidate) : undefined;
  }

  compareVersions(policyId: string, fromVersion: string, toVersion: string): PolicyVersionDiff {
    const snapshots = this.history.get(policyId) ?? [];
    const fromSnapshot = snapshots.find((snapshot) => snapshot.version === fromVersion);
    const toSnapshot = snapshots.find((snapshot) => snapshot.version === toVersion);
    if (!fromSnapshot || !toSnapshot) {
      throw new Error(`Unable to locate versions ${fromVersion} or ${toVersion} for policy ${policyId}`);
    }
    const diff: PolicyVersionDiff = {
      policyId,
      fromVersion,
      toVersion,
      addedRules: [],
      removedRules: [],
      changedRules: []
    };
    const fromMap = new Map(fromSnapshot.rules.map((rule) => [rule.id, rule]));
    const toMap = new Map(toSnapshot.rules.map((rule) => [rule.id, rule]));
    toMap.forEach((rule, id) => {
      if (!fromMap.has(id)) {
        diff.addedRules.push(rule);
      } else {
        const baseline = fromMap.get(id)!;
        if (JSON.stringify(baseline) !== JSON.stringify(rule)) {
          diff.changedRules.push({ ruleId: id, from: baseline, to: rule });
        }
      }
    });
    fromMap.forEach((rule, id) => {
      if (!toMap.has(id)) {
        diff.removedRules.push(rule);
      }
    });
    return diff;
  }

  retroactiveComplianceCheck(
    policyId: string,
    events: HistoricalPolicyEvent[]
  ): RetroactiveComplianceReport {
    const snapshots = this.history.get(policyId) ?? [];
    if (snapshots.length === 0) {
      throw new Error(`No history recorded for policy ${policyId}`);
    }
    const orderedEvents = [...events].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );
    const compliantEvents: ComplianceResult[] = [];
    const nonCompliantEvents: ComplianceResult[] = [];
    const skippedEvents: HistoricalPolicyEvent[] = [];
    const evaluationEntries: EvaluationEntry[] = [];
    for (const event of orderedEvents) {
      const snapshot = this.getSnapshotAt(policyId, event.occurredAt);
      if (!snapshot) {
        if (this.missingSnapshotStrategy === "skip") {
          skippedEvents.push(event);
          continue;
        }
        throw new Error(
          `No snapshot available for policy ${policyId} at ${new Date(event.occurredAt).toISOString()}`
        );
      }
      const engine = new PolicyEngine(snapshot.rules);
      const decision = engine.evaluate(event.request);
      const expectedEffect = resolveExpectedEffect(event);
      const compliant = expectedEffect ? decision.effect === expectedEffect : true;
      const result: ComplianceResult = {
        event,
        snapshot,
        decision,
        compliant,
        expectedEffect
      };
      evaluationEntries.push({ snapshot, decision });
      this.recordAuditEntry("retroactive", policyId, event, snapshot, decision, compliant, expectedEffect);
      if (compliant) {
        compliantEvents.push(result);
      } else {
        nonCompliantEvents.push(result);
      }
    }
    const impact = this.buildImpactReport(policyId, evaluationEntries);
    return {
      policyId,
      evaluatedEvents: compliantEvents.length + nonCompliantEvents.length,
      compliantEvents,
      nonCompliantEvents,
      skippedEvents,
      impact
    };
  }

  simulateRollback(
    policyId: string,
    targetVersion: string,
    events: HistoricalPolicyEvent[]
  ): RollbackSimulationReport {
    const snapshots = this.history.get(policyId) ?? [];
    if (snapshots.length === 0) {
      throw new Error(`No history recorded for policy ${policyId}`);
    }
    const rollbackSnapshot = snapshots.find((snapshot) => snapshot.version === targetVersion);
    if (!rollbackSnapshot) {
      throw new Error(`Target version ${targetVersion} not found for policy ${policyId}`);
    }
    const orderedEvents = [...events].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );
    const baselineVersions = new Set<string>();
    const skippedEvents: HistoricalPolicyEvent[] = [];
    const divergingEvents: RollbackDivergence[] = [];
    const evaluationEntries: EvaluationEntry[] = [];
    for (const event of orderedEvents) {
      const baselineSnapshot = this.getSnapshotAt(policyId, event.occurredAt);
      if (!baselineSnapshot) {
        if (this.missingSnapshotStrategy === "skip") {
          skippedEvents.push(event);
          continue;
        }
        throw new Error(
          `No snapshot available for policy ${policyId} at ${new Date(event.occurredAt).toISOString()}`
        );
      }
      baselineVersions.add(baselineSnapshot.version);
      const baselineEngine = new PolicyEngine(baselineSnapshot.rules);
      const rollbackEngine = new PolicyEngine(rollbackSnapshot.rules);
      const baselineDecision = baselineEngine.evaluate(event.request);
      const rollbackDecision = rollbackEngine.evaluate(event.request);
      evaluationEntries.push({ snapshot: rollbackSnapshot, decision: rollbackDecision });
      const diverges =
        baselineDecision.allowed !== rollbackDecision.allowed ||
        baselineDecision.effect !== rollbackDecision.effect ||
        baselineDecision.matchedRules.join(",") !== rollbackDecision.matchedRules.join(",");
      this.recordAuditEntry(
        "rollback",
        policyId,
        event,
        rollbackSnapshot,
        rollbackDecision,
        undefined,
        resolveExpectedEffect(event)
      );
      if (diverges) {
        divergingEvents.push({
          event,
          baselineSnapshot: cloneSnapshot(baselineSnapshot),
          rollbackSnapshot: cloneSnapshot(rollbackSnapshot),
          baselineDecision,
          rollbackDecision
        });
      }
    }
    const impact = this.buildImpactReport(policyId, evaluationEntries);
    return {
      policyId,
      targetVersion,
      baselineVersions: Array.from(baselineVersions),
      evaluatedEvents: evaluationEntries.length,
      skippedEvents,
      divergingEvents,
      impact
    };
  }

  getAuditTrail(query: AuditTrailQuery = {}): AuditRecord[] {
    const from = normalizeDate(query.from)?.getTime();
    const to = normalizeDate(query.to)?.getTime();
    return this.auditTrail
      .filter((record) => {
        if (query.policyId && record.policyId !== query.policyId) {
          return false;
        }
        if (query.simulationType && record.simulationType !== query.simulationType) {
          return false;
        }
        const ts = record.occurredAt.getTime();
        if (from !== undefined && ts < from) {
          return false;
        }
        if (to !== undefined && ts > to) {
          return false;
        }
        return true;
      })
      .map((record) => ({
        ...record,
        occurredAt: new Date(record.occurredAt),
        evaluatedAt: new Date(record.evaluatedAt),
        matchedRules: [...record.matchedRules],
        reasons: [...record.reasons]
      }));
  }

  private recordAuditEntry(
    simulationType: AuditRecord["simulationType"],
    policyId: string,
    event: HistoricalPolicyEvent,
    snapshot: PolicySnapshot,
    decision: PolicyEvaluationResult,
    compliant?: boolean,
    expectedEffect?: PolicyEffect
  ): void {
    const eventId = event.id ?? `${policyId}:${new Date(event.occurredAt).toISOString()}`;
    this.auditTrail.push({
      policyId,
      eventId,
      occurredAt: new Date(event.occurredAt),
      evaluatedAt: new Date(),
      policyVersion: snapshot.version,
      effect: decision.effect,
      allowed: decision.allowed,
      matchedRules: [...decision.matchedRules],
      reasons: [...decision.reasons],
      simulationType,
      compliant,
      expectedEffect,
      metadata: event.metadata
    });
  }

  private buildImpactReport(policyId: string, entries: EvaluationEntry[]): ImpactAnalysisReport {
    const effectCounts: Record<PolicyEffect, number> = { allow: 0, deny: 0 };
    const versionBreakdown: ImpactAnalysisReport["versionBreakdown"] = {};
    const ruleHits: Record<string, number> = {};
    const obligationCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      effectCounts[entry.decision.effect] += 1;
      if (!versionBreakdown[entry.snapshot.version]) {
        versionBreakdown[entry.snapshot.version] = { evaluated: 0, allows: 0, denies: 0 };
      }
      const breakdown = versionBreakdown[entry.snapshot.version];
      breakdown.evaluated += 1;
      if (entry.decision.allowed) {
        breakdown.allows += 1;
      } else {
        breakdown.denies += 1;
      }
      entry.decision.matchedRules.forEach((ruleId) => {
        ruleHits[ruleId] = (ruleHits[ruleId] ?? 0) + 1;
      });
      entry.decision.obligations.forEach((obligation) => {
        const key = obligation.type ?? "unknown";
        obligationCounts[key] = (obligationCounts[key] ?? 0) + 1;
      });
    });
    return {
      policyId,
      totalEvaluations: entries.length,
      effectCounts,
      versionBreakdown,
      ruleHits,
      obligationCounts
    };
  }
}

export { analyzeEvidence } from "common-types";
