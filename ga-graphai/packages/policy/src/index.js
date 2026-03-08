"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuthoritySchema = exports.loadAuthoritySchemaFromFile = exports.ConsentStateReconciler = exports.analyzeEvidence = exports.PolicyBacktestEngine = exports.PolicyEvaluator = exports.summarizeWorkflowIssues = exports.runAdversarialProbes = exports.buildGovernanceVerdict = exports.assertGovernanceIntegrity = exports.GovernanceOrchestrator = exports.MultiRegionReadiness = exports.AuthorityLicenseCompiler = exports.GuardedPolicyGateway = exports.PolicyEngine = void 0;
exports.buildDefaultPolicyEngine = buildDefaultPolicyEngine;
exports.validateWorkflow = validateWorkflow;
exports.computeWorkflowEstimates = computeWorkflowEstimates;
exports.topologicalSort = topologicalSort;
exports.planWhatIf = planWhatIf;
exports.suggestBudgetActions = suggestBudgetActions;
exports.buildPolicyInput = buildPolicyInput;
exports.collectArtifactCatalog = collectArtifactCatalog;
const common_types_1 = require("common-types");
// ============================================================================
// RUNTIME POLICY ENGINE - From HEAD
// ============================================================================
function valueMatches(left, operator, right) {
    if (left === undefined) {
        return false;
    }
    switch (operator) {
        case 'eq':
            return left === right;
        case 'neq':
            return left !== right;
        case 'lt':
            return (typeof left === 'number' && typeof right === 'number' && left < right);
        case 'lte':
            return (typeof left === 'number' && typeof right === 'number' && left <= right);
        case 'gt':
            return (typeof left === 'number' && typeof right === 'number' && left > right);
        case 'gte':
            return (typeof left === 'number' && typeof right === 'number' && left >= right);
        case 'includes':
            if (Array.isArray(right)) {
                if (Array.isArray(left)) {
                    return left.some((item) => right.includes(item));
                }
                return right.includes(left);
            }
            if (Array.isArray(left)) {
                return left.includes(right);
            }
            return false;
        default:
            return false;
    }
}
function ruleTargetsRequest(rule, request) {
    const actionMatch = rule.actions.length === 0 ||
        rule.actions.some((action) => action === request.action);
    const resourceMatch = rule.resources.length === 0 ||
        rule.resources.some((resource) => resource === request.resource);
    return actionMatch && resourceMatch;
}
function evaluateConditions(rule, request, trace) {
    if (!rule.conditions || rule.conditions.length === 0) {
        return true;
    }
    const attributes = {
        roles: request.context.roles,
        region: request.context.region,
        ...request.context.attributes,
    };
    return rule.conditions.every((condition) => {
        const candidate = attributes[condition.attribute];
        const matched = valueMatches(candidate, condition.operator, condition.value);
        if (!matched) {
            trace.push(`condition ${condition.attribute} ${condition.operator} ${JSON.stringify(condition.value)} failed`);
        }
        return matched;
    });
}
class PolicyEngine {
    rules;
    constructor(rules = []) {
        this.rules = [...rules];
    }
    registerRule(rule) {
        this.rules.push(rule);
    }
    getRules() {
        return [...this.rules];
    }
    evaluate(request) {
        const matchedRules = [];
        const reasons = [];
        const obligations = [];
        const trace = [];
        let finalEffect = 'deny';
        for (const rule of this.rules) {
            const ruleReasons = [];
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
                        trace,
                    };
                }
                finalEffect = 'allow';
                reasons.push(`Allowed by ${rule.id}`);
                if (rule.obligations) {
                    obligations.push(...rule.obligations);
                }
            }
            else {
                if (ruleReasons.length > 0) {
                    reasons.push(...ruleReasons.map((reason) => `${rule.id}: ${reason}`));
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
            trace,
        };
    }
}
exports.PolicyEngine = PolicyEngine;
var guarded_gateway_js_1 = require("./guarded-gateway.js");
Object.defineProperty(exports, "GuardedPolicyGateway", { enumerable: true, get: function () { return guarded_gateway_js_1.GuardedPolicyGateway; } });
var authority_compiler_js_1 = require("./authority-compiler.js");
Object.defineProperty(exports, "AuthorityLicenseCompiler", { enumerable: true, get: function () { return authority_compiler_js_1.AuthorityLicenseCompiler; } });
var multi_region_readiness_js_1 = require("./multi-region-readiness.js");
Object.defineProperty(exports, "MultiRegionReadiness", { enumerable: true, get: function () { return multi_region_readiness_js_1.MultiRegionReadiness; } });
var governance_verdict_js_1 = require("./governance-verdict.js");
Object.defineProperty(exports, "GovernanceOrchestrator", { enumerable: true, get: function () { return governance_verdict_js_1.GovernanceOrchestrator; } });
Object.defineProperty(exports, "assertGovernanceIntegrity", { enumerable: true, get: function () { return governance_verdict_js_1.assertGovernanceIntegrity; } });
Object.defineProperty(exports, "buildGovernanceVerdict", { enumerable: true, get: function () { return governance_verdict_js_1.buildGovernanceVerdict; } });
Object.defineProperty(exports, "runAdversarialProbes", { enumerable: true, get: function () { return governance_verdict_js_1.runAdversarialProbes; } });
Object.defineProperty(exports, "summarizeWorkflowIssues", { enumerable: true, get: function () { return governance_verdict_js_1.summarizeWorkflowIssues; } });
function buildDefaultPolicyEngine() {
    const engine = new PolicyEngine([
        {
            id: 'default-allow-intent-read',
            description: 'Allow read access to intents within the tenant',
            effect: 'allow',
            actions: ['intent:read'],
            resources: ['intent'],
            conditions: [
                {
                    attribute: 'roles',
                    operator: 'includes',
                    value: ['product-manager', 'architect'],
                },
            ],
            obligations: [{ type: 'emit-audit' }],
        },
        {
            id: 'allow-workcell-execution',
            description: 'Permit authorised roles to execute workcell tasks in approved regions',
            effect: 'allow',
            actions: ['workcell:execute'],
            resources: ['analysis', 'codegen', 'evaluation'],
            conditions: [
                {
                    attribute: 'roles',
                    operator: 'includes',
                    value: ['developer', 'architect'],
                },
                { attribute: 'region', operator: 'eq', value: 'allowed-region' },
            ],
            obligations: [{ type: 'record-provenance' }],
        },
        {
            id: 'deny-out-of-region-models',
            description: 'Block model usage when region requirements do not match',
            effect: 'deny',
            actions: ['model:invoke'],
            resources: ['llm'],
            conditions: [
                { attribute: 'region', operator: 'neq', value: 'allowed-region' },
            ],
        },
    ]);
    return engine;
}
const DEFAULT_CONFIG = {
    allowedLicenses: ['MIT', 'Apache-2.0'],
    allowedPurposes: [...common_types_1.PURPOSE_ALLOWLIST],
    modelAllowList: Array.from(common_types_1.MODEL_ALLOWLIST),
    deniedDataClasses: ['production-PII', 'secrets', 'proprietary-client'],
    redactableDataClasses: ['production-PII'],
    requireRedactionForDeniedDataClasses: true,
};
class PolicyEvaluator {
    config;
    now;
    constructor(options) {
        this.config = options?.config ?? DEFAULT_CONFIG;
        this.now = options?.now ?? (() => new Date());
    }
    evaluate(event, context = {}) {
        const explanations = [];
        const ruleIds = [];
        const denies = [];
        const model = context.model ?? event.model;
        if (!model) {
            denies.push('model-missing');
        }
        else {
            const allowReason = this.checkModel(model.name);
            explanations.push(allowReason);
            if (allowReason.startsWith('deny:')) {
                denies.push(allowReason);
            }
            else {
                ruleIds.push('model-allowlist');
            }
        }
        const purpose = context.purpose ?? event.purpose;
        const purposeDecision = this.checkPurpose(purpose);
        explanations.push(purposeDecision);
        if (purposeDecision.startsWith('deny:')) {
            denies.push(purposeDecision);
        }
        else {
            ruleIds.push('purpose-allowlist');
        }
        const license = context.repoMeta?.license;
        if (license) {
            const licenseDecision = this.checkLicense(license);
            explanations.push(licenseDecision);
            if (licenseDecision.startsWith('deny:')) {
                denies.push(licenseDecision);
            }
            else {
                ruleIds.push('license-allowlist');
            }
        }
        else {
            explanations.push('warn:license-unknown');
        }
        const scan = context.scan;
        if (scan?.piiFound) {
            denies.push('deny:pii-detected');
            explanations.push('deny:pii-detected');
        }
        else {
            explanations.push('allow:no-pii');
        }
        if (scan?.secretsFound) {
            denies.push('deny:secret-detected');
            explanations.push('deny:secret-detected');
        }
        const classes = mergeDataClasses(event, context);
        const dataClassDecision = this.checkDataClasses(classes, scan);
        explanations.push(...dataClassDecision.explanations);
        denies.push(...dataClassDecision.denies);
        if (dataClassDecision.ruleId) {
            ruleIds.push(dataClassDecision.ruleId);
        }
        const decision = {
            decision: denies.length > 0 ? 'deny' : 'allow',
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
    checkModel(modelName) {
        if (this.config.blockedModels?.[modelName]) {
            return `deny:model-blocked:${this.config.blockedModels[modelName]}`;
        }
        if (this.config.modelAllowList.includes(modelName)) {
            return `allow:model:${modelName}`;
        }
        return 'deny:model-not-allowed';
    }
    checkPurpose(purpose) {
        const override = this.config.purposeOverrides?.[purpose];
        if (override) {
            return `${override.allow ? 'allow' : 'deny'}:purpose:${override.explanation}`;
        }
        if (this.config.allowedPurposes.includes(purpose)) {
            return `allow:purpose:${purpose}`;
        }
        return 'deny:purpose-not-allowed';
    }
    checkLicense(license) {
        const override = this.config.licenseOverrides?.[license];
        if (override) {
            return `${override.allow ? 'allow' : 'deny'}:license:${override.explanation}`;
        }
        if (this.config.allowedLicenses.includes(license)) {
            return `allow:license:${license}`;
        }
        return 'deny:license-not-allowed';
    }
    checkDataClasses(classes, scan) {
        const explanations = [];
        const denies = [];
        if (classes.length === 0) {
            explanations.push('allow:no-sensitive-classes');
            return { explanations, denies, ruleId: 'data-class-baseline' };
        }
        const denied = new Set(this.config.deniedDataClasses ?? []);
        const redactable = new Set(this.config.redactableDataClasses ?? []);
        const flagged = [];
        const redactionRequired = [];
        for (const dataClass of classes) {
            if (denied.has(dataClass)) {
                flagged.push(dataClass);
                if (redactable.has(dataClass)) {
                    redactionRequired.push(dataClass);
                }
            }
        }
        if (flagged.length === 0) {
            explanations.push('allow:data-classes-ok');
            return { explanations, denies, ruleId: 'data-class-baseline' };
        }
        if (redactionRequired.length > 0 &&
            this.config.requireRedactionForDeniedDataClasses &&
            !scan?.redactionsApplied) {
            denies.push(`deny:redaction-required:${redactionRequired.join(',')}`);
            explanations.push(`deny:redaction-required:${redactionRequired.join(',')}`);
            return { explanations, denies, ruleId: 'data-class-redaction' };
        }
        if (flagged.length > 0 && redactionRequired.length === 0) {
            denies.push(`deny:data-class:${flagged.join(',')}`);
            explanations.push(`deny:data-class:${flagged.join(',')}`);
            return { explanations, denies, ruleId: 'data-class-deny' };
        }
        explanations.push('allow:data-classes-redacted');
        return { explanations, denies, ruleId: 'data-class-redaction' };
    }
}
exports.PolicyEvaluator = PolicyEvaluator;
function collectSecretRefs(params, prefix = '') {
    if (!params || typeof params !== 'object') {
        return [];
    }
    const collected = [];
    for (const [key, value] of Object.entries(params)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if ((0, common_types_1.ensureSecret)(value)) {
            collected.push({ path, ref: value });
            continue;
        }
        if (Array.isArray(value)) {
            value.forEach((entry, index) => {
                if (entry && typeof entry === 'object') {
                    collected.push(...collectSecretRefs(entry, `${path}[${index}]`));
                }
            });
        }
        else if (value && typeof value === 'object') {
            collected.push(...collectSecretRefs(value, path));
        }
    }
    return collected;
}
function validateWorkflow(workflow, options = {}) {
    const normalized = (0, common_types_1.normalizeWorkflow)(workflow, {
        evidenceRequired: options.requireEvidence ?? true,
        ...options.defaults,
    });
    const issues = [];
    const suggestions = [];
    const nodeMap = new Map();
    const seenIds = new Set();
    for (const node of normalized.nodes) {
        if (seenIds.has(node.id)) {
            issues.push({
                severity: 'error',
                code: 'node.duplicate',
                message: `Duplicate node id detected: ${node.id}`,
                nodes: [node.id],
            });
        }
        seenIds.add(node.id);
        nodeMap.set(node.id, node);
        const secretHit = scanForLiteralSecret(node.params);
        if (secretHit) {
            issues.push({
                severity: 'error',
                code: 'policy.secret',
                message: `Node ${node.id} contains literal secret at ${secretHit.path}. Use vault refs instead.`,
                nodes: [node.id],
                suggestion: 'Replace literal values with {"vault":"vault://path","key":"secret"}.',
            });
        }
        if (options.secretsManager) {
            const secretRefs = collectSecretRefs(node.params);
            for (const secret of secretRefs) {
                if (!options.secretsManager.supports(secret.ref)) {
                    issues.push({
                        severity: 'error',
                        code: 'policy.secret-provider',
                        message: `Node ${node.id} references unsupported secret provider at ${secret.path}.`,
                        nodes: [node.id],
                    });
                    continue;
                }
                const rotationStatus = options.secretsManager.describeRotation(secret.ref, options.now ?? new Date());
                if (rotationStatus.needsRotation) {
                    issues.push({
                        severity: 'warning',
                        code: 'policy.secret-rotation',
                        message: `Secret at ${secret.path} in node ${node.id} requires rotation${rotationStatus.reason ? ` (${rotationStatus.reason})` : ''}.`,
                        nodes: [node.id],
                    });
                }
            }
        }
        if (node.policy?.handlesPii && !normalized.policy.pii) {
            issues.push({
                severity: 'error',
                code: 'policy.pii',
                message: `Node ${node.id} handles PII but workflow policy does not allow pii processing.`,
                nodes: [node.id],
            });
        }
        if (node.policy?.requiresApproval) {
            const hasApprovalNode = normalized.nodes.some((candidate) => candidate.type === 'util.approval');
            if (!hasApprovalNode) {
                issues.push({
                    severity: 'warning',
                    code: 'policy.approval',
                    message: `Node ${node.id} requires an approval gate but no util.approval node is present.`,
                    nodes: [node.id],
                    suggestion: 'Insert a util.approval node before production deployment steps.',
                });
            }
        }
        if (node.estimates?.latencyP95Ms &&
            node.timeoutMs &&
            node.estimates.latencyP95Ms > node.timeoutMs) {
            issues.push({
                severity: 'warning',
                code: 'slo.timeout',
                message: `Node ${node.id} latency estimate ${node.estimates.latencyP95Ms}ms exceeds timeout ${node.timeoutMs}ms.`,
                nodes: [node.id],
                suggestion: 'Increase timeout or reduce workload size.',
            });
        }
    }
    for (const edge of normalized.edges) {
        if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
            issues.push({
                severity: 'error',
                code: 'edge.unknown-node',
                message: `Edge ${edge.from} -> ${edge.to} references unknown nodes`,
                edge,
            });
            continue;
        }
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        const incompatibility = validateArtifactCompatibility(from, to);
        if (incompatibility) {
            issues.push({
                severity: 'error',
                code: 'artifact.mismatch',
                message: incompatibility,
                edge,
                nodes: [from.id, to.id],
            });
        }
    }
    if (normalized.nodes.length > 0) {
        const sources = (0, common_types_1.listSourceNodes)(normalized);
        const sinks = (0, common_types_1.listSinkNodes)(normalized);
        if (sources.length === 0) {
            issues.push({
                severity: 'error',
                code: 'topology.no-source',
                message: 'Workflow must include at least one source node',
            });
        }
        if (sinks.length === 0) {
            issues.push({
                severity: 'error',
                code: 'topology.no-sink',
                message: 'Workflow must include at least one sink node',
            });
        }
    }
    const topology = topologicalSort(normalized);
    if (topology.cycles.length > 0 && !options.allowLoops) {
        issues.push({
            severity: 'error',
            code: 'topology.cycle',
            message: `Workflow contains cycle(s): ${topology.cycles
                .map((cycle) => cycle.join(' -> '))
                .join('; ')}`,
        });
    }
    else if (topology.cycles.length > 0) {
        suggestions.push({
            code: 'topology.loop',
            title: 'Verify loop nodes',
            detail: 'Workflow contains intentional loops. Ensure loop nodes have exit criteria and bounded iterations.',
            appliesTo: [...new Set(topology.cycles.flat())],
        });
    }
    const sources = (0, common_types_1.listSourceNodes)(normalized);
    const sinks = (0, common_types_1.listSinkNodes)(normalized);
    const reachable = discoverReachable(normalized, sources);
    const unreachable = normalized.nodes
        .map((node) => node.id)
        .filter((id) => !reachable.has(id));
    if (unreachable.length > 0) {
        issues.push({
            severity: 'warning',
            code: 'topology.unreachable',
            message: `Unreachable nodes detected: ${unreachable.join(', ')}`,
            nodes: unreachable,
        });
    }
    const evidence = (0, common_types_1.analyzeEvidence)(normalized.nodes);
    if (evidence.missing.length > 0) {
        issues.push({
            severity: 'error',
            code: 'evidence.missing',
            message: `Evidence outputs required for nodes: ${evidence.missing.join(', ')}`,
            nodes: evidence.missing,
            suggestion: 'Attach provenance or SARIF/SPDX outputs to each node.',
        });
    }
    const policyIssues = validatePolicy(normalized.policy, normalized.nodes);
    issues.push(...policyIssues);
    const estimated = computeWorkflowEstimates(normalized, topology.order);
    const budgetSuggestions = suggestBudgetActions(normalized, estimated);
    suggestions.push(...budgetSuggestions);
    if (normalized.constraints.latencyP95Ms > 0 &&
        estimated.latencyP95Ms > normalized.constraints.latencyP95Ms) {
        issues.push({
            severity: 'error',
            code: 'constraint.latency',
            message: `Estimated latency ${estimated.latencyP95Ms}ms exceeds constraint ${normalized.constraints.latencyP95Ms}ms`,
            nodes: estimated.criticalPath,
        });
    }
    else if (normalized.constraints.latencyP95Ms > 0 &&
        estimated.latencyP95Ms > normalized.constraints.latencyP95Ms * 0.8) {
        suggestions.push({
            code: 'constraint.latency.headroom',
            title: 'Latency headroom is tight',
            detail: `Estimated latency ${estimated.latencyP95Ms}ms is within 20% of the constraint ${normalized.constraints.latencyP95Ms}ms. Consider enabling caching or splitting long-running steps.`,
            appliesTo: estimated.criticalPath,
            estimatedGain: { latencyMs: Math.round(estimated.latencyP95Ms * 0.15) },
        });
    }
    if (normalized.constraints.budgetUSD > 0 &&
        estimated.costUSD > normalized.constraints.budgetUSD) {
        issues.push({
            severity: 'error',
            code: 'constraint.cost',
            message: `Estimated cost ${estimated.costUSD.toFixed(2)} exceeds budget ${normalized.constraints.budgetUSD.toFixed(2)}`,
            nodes: estimated.criticalPath,
        });
    }
    const analysis = {
        issues,
        suggestions,
        sources,
        sinks,
        unreachable,
        estimated,
        evidence,
    };
    return {
        normalized,
        analysis,
    };
}
function computeWorkflowEstimates(workflow, orderOverride) {
    if (workflow.nodes.length === 0) {
        return {
            latencyP95Ms: 0,
            costUSD: 0,
            queueMs: 0,
            successRate: 1,
            criticalPath: [],
        };
    }
    const order = orderOverride && orderOverride.length > 0
        ? orderOverride
        : topologicalSort(workflow).order;
    const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]));
    const incoming = buildIncomingMap(workflow.edges);
    const distance = new Map();
    const predecessor = new Map();
    let totalCost = 0;
    let successRateProduct = 1;
    for (const nodeId of order) {
        const node = nodeMap.get(nodeId);
        if (!node) {
            continue;
        }
        const latency = (node.estimates?.latencyP95Ms ?? 0) + (node.estimates?.queueMs ?? 0);
        totalCost += node.estimates?.costUSD ?? 0;
        if (typeof node.estimates?.successRate === 'number') {
            successRateProduct *= node.estimates.successRate;
        }
        let bestDistance = 0;
        let bestPredecessor = null;
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
    let anchor = '';
    let maxDistance = 0;
    for (const [nodeId, value] of distance.entries()) {
        if (value >= maxDistance) {
            anchor = nodeId;
            maxDistance = value;
        }
    }
    const criticalPath = [];
    let queueMs = 0;
    let cursor = anchor;
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
        criticalPath,
    };
}
function topologicalSort(workflow) {
    const adjacency = buildAdjacency(workflow.edges);
    const inDegree = new Map();
    const order = [];
    for (const node of workflow.nodes) {
        inDegree.set(node.id, 0);
    }
    for (const edge of workflow.edges) {
        inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
    const queue = [];
    for (const node of workflow.nodes) {
        if ((inDegree.get(node.id) ?? 0) === 0) {
            queue.push(node.id);
        }
    }
    const processed = new Set();
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
    const remaining = new Set();
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
function detectCycles(adjacency, candidates) {
    const cycles = [];
    const visited = new Set();
    const stack = [];
    function dfs(nodeId) {
        stack.push(nodeId);
        visited.add(nodeId);
        for (const neighbor of adjacency.get(nodeId) ?? []) {
            if (!candidates.has(neighbor)) {
                continue;
            }
            const cycleIndex = stack.indexOf(neighbor);
            if (cycleIndex >= 0) {
                cycles.push(stack.slice(cycleIndex));
            }
            else if (!visited.has(neighbor)) {
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
function planWhatIf(workflow, scenario) {
    const normalized = (0, common_types_1.normalizeWorkflow)(workflow);
    const nodes = normalized.nodes.map((node) => ({ ...node }));
    const nodeOverrides = scenario.overrides ?? {};
    for (const node of nodes) {
        const overrides = nodeOverrides[node.id];
        if (overrides) {
            node.estimates = {
                ...node.estimates,
                ...overrides,
            };
        }
        if (scenario.parallelismMultiplier && node.parallelism) {
            const multiplier = Math.max(0.1, scenario.parallelismMultiplier);
            const newParallelism = Math.max(1, Math.round(node.parallelism * multiplier));
            node.parallelism = newParallelism;
            if (node.estimates?.latencyP95Ms) {
                node.estimates.latencyP95Ms = Math.max(50, Math.round(node.estimates.latencyP95Ms / multiplier));
            }
        }
        if (scenario.cacheHitRate &&
            node.estimates?.cacheable &&
            node.estimates.costUSD) {
            const hitRate = Math.min(Math.max(scenario.cacheHitRate, 0), 0.95);
            node.estimates.costUSD = Number((node.estimates.costUSD * (1 - hitRate)).toFixed(2));
        }
    }
    return computeWorkflowEstimates({
        ...normalized,
        nodes,
    });
}
function suggestBudgetActions(workflow, estimates, threshold = 0.8) {
    const suggestions = [];
    const budget = workflow.constraints.budgetUSD;
    if (budget > 0 && estimates.costUSD >= budget * threshold) {
        suggestions.push({
            code: 'budget.watch',
            title: 'Budget usage nearing limit',
            detail: `Estimated cost ${estimates.costUSD.toFixed(2)} is at or above ${threshold * 100}% of the budget ${budget.toFixed(2)}. Consider enabling caches or reducing parallelism on expensive nodes.`,
            appliesTo: estimates.criticalPath,
            estimatedGain: { costUSD: Number((estimates.costUSD * 0.2).toFixed(2)) },
        });
    }
    const heavyNodes = workflow.nodes.filter((node) => (node.estimates?.costUSD ?? 0) > (node.budgetUSD ?? budget));
    for (const node of heavyNodes) {
        suggestions.push({
            code: 'budget.node',
            title: `Reduce spend on ${node.id}`,
            detail: `Node ${node.id} is estimated at ${node.estimates?.costUSD?.toFixed(2) ?? '0.00'}, exceeding the per-node budget of ${(node.budgetUSD ?? budget).toFixed(2)}. Introduce caching or split the workload.`,
            appliesTo: [node.id],
        });
    }
    if (workflow.constraints.maxParallelism) {
        for (const node of workflow.nodes) {
            if (node.parallelism &&
                node.parallelism > workflow.constraints.maxParallelism) {
                suggestions.push({
                    code: 'parallelism.reduce',
                    title: `Scale down ${node.id} parallelism`,
                    detail: `Parallelism ${node.parallelism} exceeds constraint ${workflow.constraints.maxParallelism}. Reduce concurrency or request an exception.`,
                    appliesTo: [node.id],
                });
            }
        }
    }
    return suggestions;
}
function buildPolicyInput(workflow) {
    return (0, common_types_1.derivePolicyInput)(workflow);
}
function validatePolicy(policy, nodes) {
    const issues = [];
    if (policy.pii && policy.retention !== common_types_1.SHORT_RETENTION) {
        issues.push({
            severity: 'error',
            code: 'policy.retention',
            message: `PII workflows must use ${common_types_1.SHORT_RETENTION} retention. Current value: ${policy.retention}`,
        });
    }
    const securityNodes = nodes.filter((node) => node.type.startsWith('security.'));
    if (securityNodes.length > 0 && policy.licenseClass !== 'SEC-APPROVED') {
        issues.push({
            severity: 'warning',
            code: 'policy.license',
            message: 'Security nodes detected. Consider upgrading licenseClass to SEC-APPROVED for scanner entitlements.',
            nodes: securityNodes.map((node) => node.id),
        });
    }
    const deployNodes = nodes.filter((node) => node.type.startsWith('deploy.'));
    if (deployNodes.length > 0 && policy.purpose !== 'production') {
        issues.push({
            severity: 'warning',
            code: 'policy.purpose',
            message: 'Deploy nodes typically require purpose=production for auditability.',
            nodes: deployNodes.map((node) => node.id),
        });
    }
    return issues;
}
function scanForLiteralSecret(params) {
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
            continue;
        }
        if (typeof value === 'string') {
            if (looksSecretLike(key, value)) {
                if (!value.startsWith('vault://') && !value.startsWith('env://')) {
                    return { path: key, value };
                }
            }
        }
        else if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index += 1) {
                const nested = value[index];
                if (typeof nested === 'string' && looksSecretLike(key, nested)) {
                    if (!nested.startsWith('vault://') && !nested.startsWith('env://')) {
                        return { path: `${key}[${index}]`, value: nested };
                    }
                }
                if (typeof nested === 'object' && nested) {
                    const result = scanForLiteralSecret(nested);
                    if (result) {
                        return {
                            path: `${key}[${index}].${result.path}`,
                            value: result.value,
                        };
                    }
                }
            }
        }
        else if (typeof value === 'object') {
            if ((0, common_types_1.ensureSecret)(value)) {
                continue;
            }
            const nestedResult = scanForLiteralSecret(value);
            if (nestedResult) {
                return {
                    path: `${key}.${nestedResult.path}`,
                    value: nestedResult.value,
                };
            }
        }
    }
    return null;
}
function looksSecretLike(key, value) {
    const sensitive = /(secret|token|password|api[-_]?key|credential|bearer)/i;
    return sensitive.test(key) || sensitive.test(value);
}
function buildAdjacency(edges) {
    const adjacency = new Map();
    for (const edge of edges) {
        if (!adjacency.has(edge.from)) {
            adjacency.set(edge.from, new Set());
        }
        adjacency.get(edge.from).add(edge.to);
    }
    return adjacency;
}
function buildIncomingMap(edges) {
    const incoming = new Map();
    for (const edge of edges) {
        if (!incoming.has(edge.to)) {
            incoming.set(edge.to, new Set());
        }
        incoming.get(edge.to).add(edge.from);
    }
    return incoming;
}
function discoverReachable(workflow, sources) {
    const adjacency = buildAdjacency(workflow.edges);
    const reachable = new Set();
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
function validateArtifactCompatibility(from, to) {
    if (!from.produces || !to.consumes) {
        return null;
    }
    const producedTypes = new Set(from.produces.map((artifact) => artifact.type));
    for (const artifact of to.consumes) {
        if (!artifact.optional && !producedTypes.has(artifact.type)) {
            return `Node ${to.id} expects artifact type ${artifact.type} from ${from.id}, but producer emits ${[...producedTypes].join(', ') || 'none'}.`;
        }
    }
    return null;
}
function collectArtifactCatalog(workflow) {
    return (0, common_types_1.enumerateArtifacts)(workflow.nodes);
}
function normalizeDate(input) {
    if (!input) {
        return undefined;
    }
    return input instanceof Date ? input : new Date(input);
}
function cloneSnapshot(snapshot) {
    return {
        ...snapshot,
        capturedAt: new Date(snapshot.capturedAt),
        rules: snapshot.rules.map((rule) => ({ ...rule })),
    };
}
function resolveExpectedEffect(event) {
    if (event.expectedEffect) {
        return event.expectedEffect;
    }
    if (event.expectedAllowed === undefined) {
        return undefined;
    }
    return event.expectedAllowed ? 'allow' : 'deny';
}
class PolicyBacktestEngine {
    history = new Map();
    auditTrail = [];
    missingSnapshotStrategy;
    constructor(history, options = {}) {
        this.missingSnapshotStrategy = options.missingSnapshotStrategy ?? 'error';
        history.forEach((item) => {
            const snapshots = item.snapshots
                .map((snapshot) => ({
                ...snapshot,
                capturedAt: new Date(snapshot.capturedAt),
            }))
                .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
            this.history.set(item.policyId, snapshots);
        });
    }
    registerSnapshot(policyId, snapshot) {
        const normalized = {
            ...snapshot,
            capturedAt: new Date(snapshot.capturedAt),
        };
        const existing = this.history.get(policyId) ?? [];
        existing.push(normalized);
        existing.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
        this.history.set(policyId, existing);
    }
    listPolicies() {
        return Array.from(this.history.keys());
    }
    getSnapshots(policyId) {
        const snapshots = this.history.get(policyId) ?? [];
        return snapshots.map((snapshot) => cloneSnapshot(snapshot));
    }
    querySnapshots(policyId, options = {}) {
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
    getSnapshotAt(policyId, timestamp) {
        const snapshots = this.history.get(policyId);
        if (!snapshots || snapshots.length === 0) {
            return undefined;
        }
        const target = normalizeDate(timestamp)?.getTime();
        if (target === undefined) {
            return undefined;
        }
        let candidate;
        for (const snapshot of snapshots) {
            if (snapshot.capturedAt.getTime() <= target) {
                candidate = snapshot;
            }
            else {
                break;
            }
        }
        return candidate ? cloneSnapshot(candidate) : undefined;
    }
    compareVersions(policyId, fromVersion, toVersion) {
        const snapshots = this.history.get(policyId) ?? [];
        const fromSnapshot = snapshots.find((snapshot) => snapshot.version === fromVersion);
        const toSnapshot = snapshots.find((snapshot) => snapshot.version === toVersion);
        if (!fromSnapshot || !toSnapshot) {
            throw new Error(`Unable to locate versions ${fromVersion} or ${toVersion} for policy ${policyId}`);
        }
        const diff = {
            policyId,
            fromVersion,
            toVersion,
            addedRules: [],
            removedRules: [],
            changedRules: [],
        };
        const fromMap = new Map(fromSnapshot.rules.map((rule) => [rule.id, rule]));
        const toMap = new Map(toSnapshot.rules.map((rule) => [rule.id, rule]));
        toMap.forEach((rule, id) => {
            if (!fromMap.has(id)) {
                diff.addedRules.push(rule);
            }
            else {
                const baseline = fromMap.get(id);
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
    retroactiveComplianceCheck(policyId, events) {
        const snapshots = this.history.get(policyId) ?? [];
        if (snapshots.length === 0) {
            throw new Error(`No history recorded for policy ${policyId}`);
        }
        const orderedEvents = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
        const compliantEvents = [];
        const nonCompliantEvents = [];
        const skippedEvents = [];
        const evaluationEntries = [];
        for (const event of orderedEvents) {
            const snapshot = this.getSnapshotAt(policyId, event.occurredAt);
            if (!snapshot) {
                if (this.missingSnapshotStrategy === 'skip') {
                    skippedEvents.push(event);
                    continue;
                }
                throw new Error(`No snapshot available for policy ${policyId} at ${new Date(event.occurredAt).toISOString()}`);
            }
            const engine = new PolicyEngine(snapshot.rules);
            const decision = engine.evaluate(event.request);
            const expectedEffect = resolveExpectedEffect(event);
            const compliant = expectedEffect
                ? decision.effect === expectedEffect
                : true;
            const result = {
                event,
                snapshot,
                decision,
                compliant,
                expectedEffect,
            };
            evaluationEntries.push({ snapshot, decision });
            this.recordAuditEntry('retroactive', policyId, event, snapshot, decision, compliant, expectedEffect);
            if (compliant) {
                compliantEvents.push(result);
            }
            else {
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
            impact,
        };
    }
    simulateRollback(policyId, targetVersion, events) {
        const snapshots = this.history.get(policyId) ?? [];
        if (snapshots.length === 0) {
            throw new Error(`No history recorded for policy ${policyId}`);
        }
        const rollbackSnapshot = snapshots.find((snapshot) => snapshot.version === targetVersion);
        if (!rollbackSnapshot) {
            throw new Error(`Target version ${targetVersion} not found for policy ${policyId}`);
        }
        const orderedEvents = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
        const baselineVersions = new Set();
        const skippedEvents = [];
        const divergingEvents = [];
        const evaluationEntries = [];
        for (const event of orderedEvents) {
            const baselineSnapshot = this.getSnapshotAt(policyId, event.occurredAt);
            if (!baselineSnapshot) {
                if (this.missingSnapshotStrategy === 'skip') {
                    skippedEvents.push(event);
                    continue;
                }
                throw new Error(`No snapshot available for policy ${policyId} at ${new Date(event.occurredAt).toISOString()}`);
            }
            baselineVersions.add(baselineSnapshot.version);
            const baselineEngine = new PolicyEngine(baselineSnapshot.rules);
            const rollbackEngine = new PolicyEngine(rollbackSnapshot.rules);
            const baselineDecision = baselineEngine.evaluate(event.request);
            const rollbackDecision = rollbackEngine.evaluate(event.request);
            evaluationEntries.push({
                snapshot: rollbackSnapshot,
                decision: rollbackDecision,
            });
            const diverges = baselineDecision.allowed !== rollbackDecision.allowed ||
                baselineDecision.effect !== rollbackDecision.effect ||
                baselineDecision.matchedRules.join(',') !==
                    rollbackDecision.matchedRules.join(',');
            this.recordAuditEntry('rollback', policyId, event, rollbackSnapshot, rollbackDecision, undefined, resolveExpectedEffect(event));
            if (diverges) {
                divergingEvents.push({
                    event,
                    baselineSnapshot: cloneSnapshot(baselineSnapshot),
                    rollbackSnapshot: cloneSnapshot(rollbackSnapshot),
                    baselineDecision,
                    rollbackDecision,
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
            impact,
        };
    }
    getAuditTrail(query = {}) {
        const from = normalizeDate(query.from)?.getTime();
        const to = normalizeDate(query.to)?.getTime();
        return this.auditTrail
            .filter((record) => {
            if (query.policyId && record.policyId !== query.policyId) {
                return false;
            }
            if (query.simulationType &&
                record.simulationType !== query.simulationType) {
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
            reasons: [...record.reasons],
        }));
    }
    recordAuditEntry(simulationType, policyId, event, snapshot, decision, compliant, expectedEffect) {
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
            metadata: event.metadata,
        });
    }
    buildImpactReport(policyId, entries) {
        const effectCounts = { allow: 0, deny: 0 };
        const versionBreakdown = {};
        const ruleHits = {};
        const obligationCounts = {};
        entries.forEach((entry) => {
            effectCounts[entry.decision.effect] += 1;
            if (!versionBreakdown[entry.snapshot.version]) {
                versionBreakdown[entry.snapshot.version] = {
                    evaluated: 0,
                    allows: 0,
                    denies: 0,
                };
            }
            const breakdown = versionBreakdown[entry.snapshot.version];
            breakdown.evaluated += 1;
            if (entry.decision.allowed) {
                breakdown.allows += 1;
            }
            else {
                breakdown.denies += 1;
            }
            entry.decision.matchedRules.forEach((ruleId) => {
                ruleHits[ruleId] = (ruleHits[ruleId] ?? 0) + 1;
            });
            entry.decision.obligations.forEach((obligation) => {
                const key = obligation.type ?? 'unknown';
                obligationCounts[key] = (obligationCounts[key] ?? 0) + 1;
            });
        });
        return {
            policyId,
            totalEvaluations: entries.length,
            effectCounts,
            versionBreakdown,
            ruleHits,
            obligationCounts,
        };
    }
}
exports.PolicyBacktestEngine = PolicyBacktestEngine;
var common_types_2 = require("common-types");
Object.defineProperty(exports, "analyzeEvidence", { enumerable: true, get: function () { return common_types_2.analyzeEvidence; } });
var consent_reconciler_1 = require("./consent-reconciler");
Object.defineProperty(exports, "ConsentStateReconciler", { enumerable: true, get: function () { return consent_reconciler_1.ConsentStateReconciler; } });
var authority_schema_validator_1 = require("./authority-schema-validator");
Object.defineProperty(exports, "loadAuthoritySchemaFromFile", { enumerable: true, get: function () { return authority_schema_validator_1.loadAuthoritySchemaFromFile; } });
Object.defineProperty(exports, "validateAuthoritySchema", { enumerable: true, get: function () { return authority_schema_validator_1.validateAuthoritySchema; } });
