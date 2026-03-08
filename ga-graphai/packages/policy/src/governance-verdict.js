"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceOrchestrator = void 0;
exports.buildGovernanceVerdict = buildGovernanceVerdict;
exports.assertGovernanceIntegrity = assertGovernanceIntegrity;
exports.runAdversarialProbes = runAdversarialProbes;
exports.summarizeWorkflowIssues = summarizeWorkflowIssues;
const node_crypto_1 = require("node:crypto");
function mapEffectToStatus(effect) {
    if (effect === 'deny') {
        return 'REJECTED';
    }
    return effect === 'allow' ? 'APPROVED' : 'REQUIRES_REVIEW';
}
function buildGovernanceVerdict(request, evaluation, options) {
    return {
        id: (0, node_crypto_1.randomUUID)(),
        status: mapEffectToStatus(evaluation.effect),
        action: request.action,
        resource: request.resource,
        policyIds: evaluation.matchedRules,
        matchedRules: evaluation.matchedRules,
        reasons: evaluation.reasons,
        timestamp: (options.now ?? (() => new Date()))().toISOString(),
        evaluatedBy: options.evaluatedBy,
        surface: options.surface,
        recommendations: options.recommendations,
        evidence: options.evidence,
        runtime: options.runtime,
        actor: {
            tenantId: request.context.tenantId,
            userId: request.context.userId,
            roles: request.context.roles,
            region: request.context.region,
        },
    };
}
class GovernanceOrchestrator {
    evaluatedBy;
    defaultSurface;
    now;
    engine;
    engineFactory;
    constructor(engine, options) {
        this.engine = engine;
        this.evaluatedBy = options.evaluatedBy;
        this.defaultSurface = options.defaultSurface ?? 'microservice';
        this.now = options.now ?? (() => new Date());
        this.engineFactory = options.engineFactory;
    }
    evaluateUserAction(request, opts = {}) {
        return this.evaluate(request, {
            surface: opts.surface ?? this.defaultSurface,
            dynamicRules: opts.dynamicRules,
        });
    }
    evaluateRecommendation(recommendation, request, opts = {}) {
        const governed = this.evaluate(request, {
            surface: opts.surface ?? 'ui',
            dynamicRules: opts.dynamicRules,
        });
        return {
            payload: {
                recommendation,
                policy: governed.payload,
            },
            governance: governed.governance,
        };
    }
    evaluateOutput(payload, request, opts = {}) {
        const governed = this.evaluate(request, {
            surface: opts.surface ?? 'workflow',
            dynamicRules: opts.dynamicRules,
        });
        return {
            payload,
            governance: governed.governance,
        };
    }
    validateWorkflow(workflow, validation, opts = {}) {
        const request = {
            action: 'workflow:validate',
            resource: workflow.id ?? 'workflow',
            context: {
                tenantId: workflow.tenantId ?? 'unknown',
                userId: workflow.owner ?? 'system',
                roles: workflow.roles ?? ['system'],
                region: workflow.region,
            },
        };
        const issues = validation.issues ?? [];
        const effect = issues.some((issue) => issue.severity === 'error')
            ? 'deny'
            : 'allow';
        const evaluation = {
            allowed: effect === 'allow',
            effect,
            matchedRules: issues.map((issue) => issue.ruleId ?? 'validation'),
            reasons: issues.map((issue) => issue.message),
            obligations: [],
            trace: issues.map((issue) => ({
                ruleId: issue.ruleId ?? 'validation',
                matched: true,
                reasons: [issue.message],
            })),
        };
        const governed = this.evaluate(request, {
            surface: opts.surface ?? 'workflow',
            dynamicRules: opts.dynamicRules,
            evaluation,
        });
        return {
            payload: validation,
            governance: governed.governance,
        };
    }
    evaluate(request, opts) {
        const start = performance.now();
        const engine = opts.dynamicRules && this.engineFactory
            ? this.engineFactory(opts.dynamicRules)
            : this.engine;
        const evaluation = opts.evaluation ?? engine.evaluate(request);
        const governance = buildGovernanceVerdict(request, evaluation, {
            evaluatedBy: this.evaluatedBy,
            surface: opts.surface,
            now: this.now,
            runtime: {
                latencyMs: performance.now() - start,
                dynamicRulesApplied: opts.dynamicRules?.map((rule) => rule.id),
            },
        });
        assertGovernanceIntegrity({ payload: evaluation, governance });
        return { payload: evaluation, governance };
    }
}
exports.GovernanceOrchestrator = GovernanceOrchestrator;
function assertGovernanceIntegrity(envelope) {
    if (!envelope || !envelope.governance) {
        throw new Error('Governance verdict missing from envelope');
    }
    const { governance } = envelope;
    if (!governance.id || !governance.timestamp) {
        throw new Error('Governance verdict is incomplete');
    }
}
function runAdversarialProbes(orchestrator, probes) {
    return probes.map((probe) => {
        const outcome = orchestrator.evaluateUserAction(probe.request, {
            dynamicRules: probe.dynamicRules,
        });
        const bypassDetected = (probe.expectedStatus && outcome.governance.status !== probe.expectedStatus) ||
            (probe.expectedReasons && !probe.expectedReasons.every((reason) => outcome.governance.reasons.includes(reason)));
        return {
            name: probe.name,
            verdict: outcome.governance,
            bypassDetected,
        };
    });
}
function summarizeWorkflowIssues(issues) {
    return issues.map((issue) => `${issue.severity}:${issue.ruleId ?? 'validation'}:${issue.message}`);
}
