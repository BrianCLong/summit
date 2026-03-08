"use strict";
/**
 * Common types and helpers shared across Maestro Conductor services.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETENTION = exports.SHORT_RETENTION = exports.DEFAULT_VALIDATION_DEFAULTS = exports.NODE_CATEGORIES = exports.PURPOSE_ALLOWLIST = exports.MODEL_ALLOWLIST = exports.TENANT_BUDGETS = exports.ZERO_SPEND_OPTIMIZATIONS = exports.LICENSE_CLASSES = exports.SAFETY_TIERS = exports.RESOURCE_KINDS = void 0;
exports.normalizeCursorEvent = normalizeCursorEvent;
exports.mergeDataClasses = mergeDataClasses;
exports.emptyWorkflow = emptyWorkflow;
exports.normalizeWorkflow = normalizeWorkflow;
exports.derivePolicyInput = derivePolicyInput;
exports.analyzeEvidence = analyzeEvidence;
exports.listSourceNodes = listSourceNodes;
exports.listSinkNodes = listSinkNodes;
exports.listOrphanNodes = listOrphanNodes;
exports.summarizeWorkflow = summarizeWorkflow;
exports.createWhatIfScenario = createWhatIfScenario;
exports.enumerateArtifacts = enumerateArtifacts;
exports.buildLedgerUri = buildLedgerUri;
exports.collectEvidencePointers = collectEvidencePointers;
exports.ensureSecret = ensureSecret;
exports.validateTaskSpec = validateTaskSpec;
__exportStar(require("./events"), exports);
// ============================================================================
// MERGE TRAIN: Preserving existing LinearX types + adding Cursor governance
// ============================================================================
__exportStar(require("./linearx"), exports);
__exportStar(require("./replay"), exports);
exports.RESOURCE_KINDS = {
    MODEL: 'model',
    RUNTIME: 'runtime',
    HARDWARE: 'hardware',
};
exports.SAFETY_TIERS = { A: 'A', B: 'B', C: 'C' };
exports.LICENSE_CLASSES = {
    MIT_OK: 'MIT-OK',
    OPEN_DATA_OK: 'Open-Data-OK',
    RESTRICTED_TOS: 'Restricted-TOS',
};
exports.ZERO_SPEND_OPTIMIZATIONS = {
    KV_CACHE: 'kvCache',
    MEMOIZATION: 'memo',
    QUANTIZATION: 'quant',
    SPECULATIVE_DECODE: 'specDecode',
    BATCHING: 'batching',
    VLLM: 'vLLM',
    LORA: 'LoRA',
};
const EMPTY_USAGE = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
};
function normalizeUsage(usage) {
    if (!usage) {
        return EMPTY_USAGE;
    }
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
    return {
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd: usage.cost_usd,
        currency: usage.currency,
    };
}
function normalizeCursorEvent(payload) {
    return {
        tenantId: payload.tenant_id,
        repo: payload.repo,
        branch: payload.branch,
        actor: {
            id: payload.actor.id,
            email: payload.actor.email,
            displayName: payload.actor.display_name,
        },
        event: payload.event,
        ts: payload.ts,
        model: payload.model
            ? {
                name: payload.model.name,
                vendor: payload.model.vendor,
                routing: payload.model.routing,
                version: payload.model.version,
            }
            : undefined,
        inputRef: payload.input_ref
            ? {
                promptSha256: payload.input_ref.prompt_sha256,
                contextRefs: payload.input_ref.context_refs,
                summary: payload.input_ref.summary,
            }
            : undefined,
        outputRef: payload.output_ref
            ? {
                diffSha256: payload.output_ref.diff_sha256,
                linesAdded: payload.output_ref.lines_added,
                linesModified: payload.output_ref.lines_modified,
                artifactSha256: payload.output_ref.artifact_sha256,
            }
            : undefined,
        purpose: payload.purpose,
        policy: payload.policy,
        provenance: {
            sessionId: payload.provenance.session_id,
            requestId: payload.provenance.request_id,
            parentRequestId: payload.provenance.parent_request_id,
        },
        usage: normalizeUsage(payload.usage),
        storyRef: payload.story_ref,
        dataClasses: payload.data_classes,
        workspaceRulesVersion: payload.workspace_rules_version,
        tags: payload.tags,
    };
}
function mergeDataClasses(event, context) {
    const classes = new Set();
    for (const value of event.dataClasses ?? []) {
        classes.add(value);
    }
    for (const value of context?.dataClasses ?? []) {
        classes.add(value);
    }
    return Array.from(classes);
}
const DAY_MS = 24 * 60 * 60 * 1000;
exports.TENANT_BUDGETS = {
    test: {
        tokens: 3_000_000,
        currency: 25,
        windowMs: DAY_MS,
        alertPercent: 0.8,
    },
    demo: {
        tokens: 3_000_000,
        currency: 25,
        windowMs: DAY_MS,
        alertPercent: 0.8,
    },
    'maestro-internal': {
        tokens: 3_000_000,
        currency: 25,
        windowMs: DAY_MS,
        alertPercent: 0.8,
    },
    'production-sample': {
        tokens: 12_000_000,
        currency: 100,
        windowMs: DAY_MS,
        alertPercent: 0.85,
    },
};
exports.MODEL_ALLOWLIST = ['gpt-4.1-mini', 'claude-3.5-sonnet'];
exports.PURPOSE_ALLOWLIST = [
    'investigation',
    'threat-intel',
    'fraud-risk',
    't&s',
    'benchmarking',
    'training',
    'demo',
];
// ============================================================================
// MAESTRO CONDUCTOR WORKFLOW TYPES - Added from PR 1313
// ============================================================================
exports.NODE_CATEGORIES = {
    source: ['git.clone', 's3.fetch', 'artifact.import'],
    build: ['build.compile', 'build.cache'],
    test: ['test.junit', 'test.pytest', 'test.map', 'test.reduce'],
    quality: ['quality.lint', 'quality.coverage'],
    security: ['security.sca', 'security.sast', 'security.dast'],
    package: ['package.docker', 'package.helm'],
    deploy: ['deploy.canary', 'deploy.rollback', 'deploy.promotion'],
    utility: [
        'util.fanout',
        'util.fanin',
        'util.gate',
        'util.approval',
        'util.map',
        'util.reduce',
    ],
    ai: ['ai.summarize', 'ai.release-notes'],
};
exports.DEFAULT_VALIDATION_DEFAULTS = {
    retries: 1,
    timeoutMs: 15 * 60 * 1000,
    budgetUSD: 5,
    evidenceRequired: true,
};
exports.SHORT_RETENTION = 'short-30d';
exports.DEFAULT_RETENTION = 'standard-365d';
function emptyWorkflow(tenantId, name, createdBy) {
    return normalizeWorkflow({
        workflowId: '',
        name,
        version: 1,
        tenantId,
        policy: {
            purpose: 'engineering',
            retention: exports.DEFAULT_RETENTION,
            licenseClass: 'MIT-OK',
            pii: false,
        },
        constraints: {
            latencyP95Ms: 30 * 60 * 1000,
            budgetUSD: 25,
            errorBudgetPercent: 0.1,
            maxParallelism: 32,
        },
        nodes: [],
        edges: [],
        createdBy,
        createdAt: createdBy ? new Date().toISOString() : undefined,
    });
}
function normalizeWorkflow(workflow, defaults = {}) {
    const mergedDefaults = {
        ...exports.DEFAULT_VALIDATION_DEFAULTS,
        ...workflow.defaults,
        ...defaults,
    };
    const nodes = workflow.nodes.map((node) => applyNodeDefaults(node, mergedDefaults));
    return {
        ...workflow,
        defaults: mergedDefaults,
        nodes,
    };
}
function applyNodeDefaults(node, defaults) {
    return {
        ...node,
        retries: node.retries ?? defaults.retries,
        timeoutMs: node.timeoutMs ?? defaults.timeoutMs,
        budgetUSD: node.budgetUSD ?? defaults.budgetUSD,
        evidenceOutputs: node.evidenceOutputs && node.evidenceOutputs.length > 0
            ? node.evidenceOutputs
            : defaults.evidenceRequired
                ? [
                    {
                        type: 'provenance',
                        path: `prov/${node.id}.json`,
                        required: true,
                    },
                ]
                : [],
    };
}
function derivePolicyInput(workflow) {
    const normalized = normalizeWorkflow(workflow);
    const evidence = analyzeEvidence(normalized.nodes);
    return {
        workflow: normalized,
        topology: { edges: normalized.edges },
        evidence,
        constraints: normalized.constraints,
    };
}
function analyzeEvidence(nodes) {
    const missing = [];
    const optional = [];
    const complete = [];
    for (const node of nodes) {
        const outputs = node.evidenceOutputs ?? [];
        if (!outputs.length) {
            missing.push(node.id);
            continue;
        }
        const requiredOutputs = outputs.filter((item) => item.required !== false);
        if (!requiredOutputs.length) {
            optional.push(node.id);
        }
        else {
            complete.push(node.id);
        }
    }
    return { missing, optional, complete };
}
function listSourceNodes(workflow) {
    const targets = new Set(workflow.edges.map((edge) => edge.to));
    return workflow.nodes
        .filter((node) => !targets.has(node.id))
        .map((node) => node.id);
}
function listSinkNodes(workflow) {
    const outgoing = new Set(workflow.edges.map((edge) => edge.from));
    return workflow.nodes
        .filter((node) => !outgoing.has(node.id))
        .map((node) => node.id);
}
function listOrphanNodes(workflow) {
    const sources = new Set(listSourceNodes(workflow));
    const sinks = new Set(listSinkNodes(workflow));
    return workflow.nodes
        .filter((node) => !sources.has(node.id) && !sinks.has(node.id))
        .map((node) => node.id);
}
function summarizeWorkflow(workflow) {
    const pools = new Set();
    for (const node of workflow.nodes) {
        if (node.pool) {
            pools.add(node.pool);
        }
    }
    return {
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length,
        pools,
    };
}
function createWhatIfScenario(label, overrides) {
    return {
        label,
        overrides,
    };
}
function enumerateArtifacts(nodes) {
    const collected = [];
    for (const node of nodes) {
        if (node.produces) {
            collected.push(...node.produces);
        }
    }
    return collected;
}
function buildLedgerUri(context, runId) {
    const base = context.ledgerBaseUri.replace(/\/$/, '');
    return `${base}/${runId}`;
}
function collectEvidencePointers(nodes) {
    const pointers = [];
    for (const node of nodes) {
        for (const evidence of node.evidenceOutputs ?? []) {
            pointers.push({
                nodeId: node.id,
                path: evidence.path,
                type: evidence.type,
            });
        }
    }
    return pointers;
}
function ensureSecret(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    const provider = candidate.provider ?? 'vault';
    if (provider === 'vault') {
        const vaultCandidate = candidate;
        return (typeof vaultCandidate.vault === 'string' &&
            typeof vaultCandidate.key === 'string');
    }
    if (provider === 'kms') {
        const kmsCandidate = candidate;
        return (typeof kmsCandidate.keyId === 'string' &&
            typeof kmsCandidate.ciphertext === 'string' &&
            typeof kmsCandidate.key === 'string');
    }
    return false;
}
const REQUIRED_AC_THRESHOLD = 0.01;
function validateTaskSpec(spec) {
    const errors = [];
    const warnings = [];
    if (!spec.taskId.trim()) {
        errors.push('taskId is required');
    }
    if (!spec.tenantId.trim()) {
        errors.push('tenantId is required');
    }
    if (!spec.goal.trim()) {
        errors.push('goal is required');
    }
    if (spec.acceptanceCriteria.length === 0) {
        errors.push('at least one acceptance criteria is required');
    }
    spec.acceptanceCriteria.forEach((ac) => {
        if (!ac.statement.trim()) {
            errors.push(`${ac.id} statement is empty`);
        }
        if (parseFloat(ac.threshold) < REQUIRED_AC_THRESHOLD) {
            warnings.push(`${ac.id} threshold appears too low`);
        }
    });
    if (spec.constraints.budgetUSD <= 0) {
        errors.push('budget must be positive');
    }
    if (spec.constraints.latencyP95Ms <= 0) {
        errors.push('latencyP95Ms must be positive');
    }
    if (spec.constraints.contextTokensMax <= 0) {
        errors.push('contextTokensMax must be positive');
    }
    if (!spec.policy.retention) {
        errors.push('policy.retention missing');
    }
    if (spec.policy.pii) {
        if (!spec.policyTags.includes('pii:present')) {
            warnings.push('PII flagged but policy tag missing');
        }
    }
    else if (!spec.policyTags.includes('pii:absent')) {
        warnings.push('PII absent but missing explicit policy tag');
    }
    const due = Date.parse(spec.sla.due);
    if (Number.isNaN(due)) {
        errors.push('sla.due must be ISO date');
    }
    const coverage = new Set();
    for (const ac of spec.acceptanceCriteria) {
        coverage.add(ac.id);
    }
    if (coverage.size !== spec.acceptanceCriteria.length) {
        errors.push('acceptance criteria ids must be unique');
    }
    spec.policyTags.forEach((tag) => {
        if (tag.startsWith('license') &&
            spec.policy.licenseClass === 'RESTRICTED') {
            warnings.push('license tag indicates restrictions; verify downstream routing');
        }
    });
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
